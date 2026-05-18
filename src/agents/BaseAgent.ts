export interface AgentContext {
    // Context passed to the agent
    [key: string]: any;
}

export interface AgentStep {
    thought: string;
    action?: string;
    actionInput?: Record<string, any>;
    observation?: string;
    error?: string;
}

export interface AgentResponse {
    finalAnswer: string;
    steps: AgentStep[];
    tokensUsed?: number;
    latencyMs?: number;
}

export interface LLMResponse {
    text: string;
    tokensUsed?: number;
}

/**
 * Strategy interface for the Language Model provider.
 * This allows swapping out OpenAI, Anthropic, local models, etc.
 */
export interface LLMProvider {
    /**
     * Generates a response from the LLM based on the prompt.
     * Strict error handling is expected or propagated to the agent.
     */
    generate(prompt: string, context?: any): Promise<LLMResponse>;
}

/**
 * Base abstract class for Autonomous Agents using the ReAct (Reasoning and Acting) pattern.
 * Enforces the Thought -> Action -> Observation loop.
 */
export abstract class BaseAgent {
    protected llmProvider?: LLMProvider;
    protected maxIterations: number;
    protected name: string;
    protected modelName: string;

    constructor(nameOrModel: string, llmProvider?: LLMProvider, maxIterations: number = 5) {
        this.name = nameOrModel;
        this.modelName = nameOrModel;
        this.llmProvider = llmProvider;
        this.maxIterations = maxIterations;
    }

    /**
     * Formats the total prompt (System instructions + History) for the LLM. 
     * Can be overridden by subclasses.
     */
    protected buildPrompt(objective: string, steps: AgentStep[], context: AgentContext): string { return objective; }

    /**
     * Parses the LLM output into Thought, Action, and ActionInput.
     */
    protected parseResponse(llmOutput: string): Partial<AgentStep> { return {}; }

    /**
     * Executes a specific tool/action requested by the LLM.
     */
    protected executeAction(action: string, actionInput: Record<string, any>): Promise<string> { return Promise.resolve(""); }

    /**
     * Simple one-shot text generation for straightforward agents.
     */
    protected async generateResponse(systemPrompt: string, userContent: string): Promise<string> {
        // Implement simple LLMProvider call
        const prompt = `${systemPrompt}\n\nUser: ${userContent}`;
        if (!this.llmProvider) {
            console.warn(`[WARN][Agent: ${this.name}] LLMProvider missing. Returning dummy response.`);
            return JSON.stringify({ error: "Missing LLM Provider", payload: "Veuillez configurer la clé API dans .env.local" });
        }
        const output = await this.llmProvider.generate(prompt);
        return output.text;
    }

    /**
     * Parses raw JSON from an LLM response safely.
     */
    protected parseJson<T>(text: string): T {
        try {
            // Un-escape typical markdown json wrappers
            let clean = text.trim();
            if (clean.startsWith('```json')) clean = clean.substring(7);
            if (clean.startsWith('```')) clean = clean.substring(3);
            if (clean.endsWith('```')) clean = clean.substring(0, clean.length - 3);
            return JSON.parse(clean.trim()) as T;
        } catch (e) {
            console.error("Failed to parse JSON:", text);
            throw e;
        }
    }

    /**
     * Runs the agent to achieve the given objective.
     */
    public async run(objective: string, context: AgentContext = {}): Promise<AgentResponse> {
        const steps: AgentStep[] = [];
        let totalTokens = 0;
        const startTime = Date.now();

        this.logInfo(`Starting execution for objective: "${objective}"`);

        for (let i = 0; i < this.maxIterations; i++) {
            this.logInfo(`Iteration ${i + 1}/${this.maxIterations}`);

            const prompt = this.buildPrompt(objective, steps, context);

            let llmOutput: LLMResponse;
            try {
                const invokeStartTime = Date.now();
                if (!this.llmProvider) {
                    throw new Error(`LLMProvider not configured for agent ${this.name}`);
                }
                llmOutput = await this.llmProvider.generate(prompt);
                const invokeLatency = Date.now() - invokeStartTime;

                totalTokens += llmOutput.tokensUsed || 0;
                this.logInfo(`LLM call successful. Latency: ${invokeLatency}ms, Tokens: ${llmOutput.tokensUsed || 'unknown'}`);
            } catch (error: any) {
                this.logError(`LLM call failed`, error);
                throw new Error(`Agent [${this.name}] execution failed due to LLM error: ${error.message}`);
            }

            let parsedStep: Partial<AgentStep>;
            try {
                parsedStep = this.parseResponse(llmOutput.text);
            } catch (error: any) {
                this.logWarn(`Failed to parse LLM response. Feeding error back to LLM. Error: ${error.message}`);
                // Feed the parsing error back as an observation so the LLM can self-correct in the next loop
                steps.push({
                    thought: 'Output format was invalid.',
                    error: `Parsing error: ${error.message}. Please strictly follow the requested output format.`
                });
                continue;
            }

            if (!parsedStep.thought) {
                this.logWarn(`LLM response missing thought process.`);
                parsedStep.thought = "No thought provided.";
            }

            const currentStep: AgentStep = {
                thought: parsedStep.thought,
                action: parsedStep.action,
                actionInput: parsedStep.actionInput
            };

            // Stop condition: If no action is provided or action is final answer
            if (!parsedStep.action || parsedStep.action.toLowerCase() === 'final_answer') {
                this.logInfo(`Agent reached final answer.`);

                const finalAnswer = parsedStep.actionInput?.answer || parsedStep.thought;
                return {
                    finalAnswer,
                    steps,
                    tokensUsed: totalTokens,
                    latencyMs: Date.now() - startTime
                };
            }

            this.logInfo(`Executing action: ${parsedStep.action}`, parsedStep.actionInput);

            // Execute the action to get an observation
            try {
                const observation = await this.executeAction(parsedStep.action, parsedStep.actionInput || {});
                currentStep.observation = observation;
                this.logInfo(`Action successful. Observation generated.`);
            } catch (error: any) {
                this.logError(`Action execution failed: ${parsedStep.action}`, error);
                currentStep.error = `Action failed: ${error.message}`;
                currentStep.observation = `Error executing action: ${error.message}`;
            }

            steps.push(currentStep);
        }

        this.logWarn(`Max iterations (${this.maxIterations}) reached without a conclusive answer.`);
        return {
            finalAnswer: "Error: Max iterations reached without a conclusive answer.",
            steps,
            tokensUsed: totalTokens,
            latencyMs: Date.now() - startTime
        };
    }

    // --- Strict Logging Methods ---

    protected logInfo(message: string, meta?: any) {
        console.info(`[INFO][Agent: ${this.name}] ${message}`, meta ? meta : '');
    }

    protected logWarn(message: string, meta?: any) {
        console.warn(`[WARN][Agent: ${this.name}] ${message}`, meta ? meta : '');
    }

    protected logError(message: string, error: any) {
        console.error(`[ERROR][Agent: ${this.name}] ${message}`, error);
    }
}
