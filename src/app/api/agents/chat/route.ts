import { NextResponse } from 'next/server';
import { CopilotAgent } from '@/agents/copilot-agent';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { query, conversationHistory = [] } = body;

        if (!query) {
            return NextResponse.json({ success: false, error: 'Query is missing' }, { status: 400 });
        }

        const agent = new CopilotAgent();
        const output = await agent.execute({ query, conversationHistory });

        return NextResponse.json({ success: true, data: output });
    } catch (error: any) {
        console.error("Erreur Copilot API:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Erreur interne de l'assistante." },
            { status: 500 }
        );
    }
}
