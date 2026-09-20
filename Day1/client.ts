export class LLMClient {
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async prompt(inputMessage: string): Promise<LLMMessage> {
        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    { role: 'user', content: inputMessage }
                ]
            })
        });
        const data = await response.json();
        return new LLMMessage(data);
    }
}

export class LLMMessage {
    private id: string;
    private model: string;
    private choices: Choice[];

    constructor(data: any) {
        this.id = data.id;
        this.model = data.model;
        this.choices = data.choices.map((choice: any) => new Choice(choice));
    }
}

export class Choice {
    private index: number;
    private message: Message;
    private finish_reason: string;

    constructor(data: any) {
        this.index = data.index;
        this.message = new Message(data.message);
        this.finish_reason = data.finish_reason;
    }
}

export class Message {
    private content: string;
    private role: string;

    constructor(data: any) {
        this.content = data.content;
        this.role = data.role;
    }
}