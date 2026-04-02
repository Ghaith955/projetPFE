import { Component } from '@angular/core';
import { ApiService } from '../services/api.service';

interface ChatMessage {
  text: string;
  sender: 'bot' | 'user';
  timestamp: Date;
}

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css']
})
export class ChatbotComponent {
  isOpen = false;
  userInput = '';
  isTyping = false;

  messages: ChatMessage[] = [
    {
      text: 'Bonjour ! 👋 Je suis l\'assistant IDSS Natation. Comment puis-je vous aider ?',
      sender: 'bot',
      timestamp: new Date()
    }
  ];

  constructor(private api: ApiService) {}

  toggleChat() {
    this.isOpen = !this.isOpen;
  }

  sendMessage() {
    const text = this.userInput.trim();
    if (!text) return;

    this.messages.push({
      text,
      sender: 'user',
      timestamp: new Date()
    });
    this.userInput = '';
    this.isTyping = true;

    // Convert messages array to OpenRouter format
    // Map local 'bot' to 'assistant' and 'user' to 'user'
    const payloadMessages = this.messages.map(m => ({
      role: m.sender === 'bot' ? 'assistant' : 'user',
      content: m.text
    }));

    this.api.sendChatMessage(payloadMessages).subscribe({
      next: (response: any) => {
        this.isTyping = false;
        
        let reply = "Je suis désolé, je n'ai pas pu préparer ma réponse correctement.";
        // Extract the response content from the typical OpenAI/OpenRouter structure
        if (response && response.choices && response.choices.length > 0 && response.choices[0].message) {
          reply = response.choices[0].message.content;
        }

        this.messages.push({
          text: reply,
          sender: 'bot',
          timestamp: new Date()
        });
      },
      error: (err: any) => {
        console.error("Chat error:", err);
        this.isTyping = false;
        this.messages.push({
          text: "Désolé, je rencontre des problèmes de réseau avec mon serveur vocal 🤖. Veuillez réessayer plus tard.",
          sender: 'bot',
          timestamp: new Date()
        });
      }
    });
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.sendMessage();
    }
  }
}
