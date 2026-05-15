import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef
} from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

interface ChatMessage {
  text: string;
  sender: 'bot' | 'user';
  timestamp: Date;
}

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = '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';
const GROQ_MODEL   = 'llama-3.3-70b-versatile';

const SYSTEM_PROMPT = `Tu es l'assistant IA officiel de la plateforme IDSS Natation — le système intelligent de gestion de la section natation du Stade Tunisien (club sportif tunisien).

## À PROPOS DU PROJET
- **Nom complet :** IDSS Natation — Intelligent Decision Support System
- **Auteur :** JAMAI RAED (projet de fin d'études — PFE)
- **Club :** Stade Tunisien, section Natation, Tunisie
- **Stack technique :**
  - Frontend : Angular 17 (TypeScript, Angular Material, CSS glassmorphism)
  - Backend : Node.js / Express.js (REST API, JWT auth)
  - Base de données : MongoDB (collections : users, nageurs, entraineurs, performances, competitions, competitionResults, entrainements, cotisations, demandes, rankingSnapshots, idssDecisions, notifications)
  - IA / ML : Python 3.11 + FastAPI (port 8000), scikit-learn, numpy — service séparé
  - Authentification : JWT tokens, roles : admin / entraineur / nageur

## RÔLES ET ACCÈS
- **Admin :** Gestion globale — utilisateurs, nageurs, entraîneurs, cotisations, compétitions, statistiques, tableau de bord analytique IDSS
- **Entraîneur (Coach) :** Planification des entraînements, saisie des performances de ses nageurs assignés, suivi des décisions IDSS, recommandations compétitions
- **Nageur (Swimmer) :** Consultation de ses propres performances, plan d'entraînement personnalisé, prédictions, classement, profil

## MODULES FONCTIONNELS

### 1. Gestion des utilisateurs & inscription
- Inscription via formulaire avec demande d'approbation admin
- Profils distincts : admin / entraîneur / nageur
- Chaque nageur est assigné à un entraîneur par l'admin
- Photos de profil uploadées via /uploads

### 2. Gestion des entraînements (Planning)
- Création de séances par les entraîneurs
- Types : endurance / sprint / technique
- Chaque séance a : date, durée, intensité, épreuve (nage), distance

### 3. Saisie des performances
- L'entraîneur enregistre les résultats après chaque séance
- Données : nageur, type (Entrainement/Competition), temps, distance, intensité, assiduité (present/absent), feedback, sessionLoad
- La saisie d'une performance déclenche automatiquement l'analyse IDSS (Layer 1 — règles Node.js)

### 4. Système IDSS — Couche 1 (Node.js, toujours actif)
- 11 règles automatiques déclenchées à chaque sauvegarde de performance
- Génère des décisions : "fatigue", "plan", "prediction", "alert"
- Scores de fatigue, charges d'entraînement, ACWR (Acute:Chronic Workload Ratio)
- Résultats stockés dans la collection idssDecisions

### 5. Système IDSS — Couche 2 (Python/FastAPI, port 8000)
- **Analyse de performance :** tendances (amélioration/stable/déclin), numpy.polyfit
- **Prédiction de temps :** régression linéaire scikit-learn, score R², niveaux HIGH/MEDIUM/LOW
- **Détection de fatigue avancée :** 6 règles pondérées, score 0-100
- **Recommandation compétition :** scoring multi-facteurs (35% perf, 25% progression, 15% fatigue…)
- **Simulation what-if :** projection ACWR sur N semaines avec avertissements
- **Planning personnalisé :** périodisation (BASE/BUILD/PEAK/RECOVERY), ajustements de charge ≤ 10%/semaine
- **Explainabilité :** raisonnement étape par étape, contribution de chaque facteur, résumé en français
- **API Swagger :** http://localhost:8000/docs

### 6. Gestion des compétitions
- Calendrier des compétitions
- Résultats de compétition (CompetitionResult) : score, rang, temps, distance, style
- Recommandation IA de nageurs pour chaque compétition

### 7. Classement IDSS (Ranking)
- Snapshots hebdomadaires, mensuels, annuels
- Basé sur les résultats de compétition (ou performances d'entraînement en fallback)
- Score composite : 35% distance + 25% intensité + 25% assiduité + 15% volume
- MVP, top 3 avec badges or/argent/bronze

### 8. Cotisations
- Gestion des paiements des adhérents
- Génération de factures PDF
- Statistiques de recouvrement

### 9. Notifications
- Système de notifications en temps réel (in-app)
- Déclenchées par : nouvelles décisions IDSS, approbations, alertes

### 10. Chatbot IA (toi !)
- Accessible en appuyant sur "/" dans l'interface
- Taper "chat", "chatbot", "bot" puis Entrée pour ouvrir
- Powered by Groq (LLaMA 3.3 70B)
- Comprend le projet et répond en français

## NAVIGATION FRONTEND
- /dashboard → Tableau de bord (admin/coach/nageur selon rôle)
- /nageurs → Liste et gestion des nageurs
- /entraineurs → Liste et gestion des entraîneurs
- /planning → Planification des entraînements
- /competitions → Compétitions
- /cotisations → Gestion des cotisations
- /training-analytics → Analytiques avancées IDSS
- /profile → Profil utilisateur
- /simulation → Simulation de scénarios IA
- /my-performance → Performances du nageur connecté

## INSTRUCTIONS DE COMPORTEMENT
- Réponds TOUJOURS en français
- Sois précis et concis (max 4-5 phrases par réponse sauf si on te demande une explication détaillée)
- Si on te demande comment faire quelque chose dans l'app, explique étape par étape
- Si on te demande des données spécifiques d'un nageur, explique que tu n'as pas accès en temps réel à la BDD, mais décris comment les trouver dans l'interface
- Tu peux expliquer la technologie, l'architecture, les algorithmes IA, les règles IDSS
- Tu es sympathique, professionnel et toujours utile
- Ne réponds pas à des sujets sans rapport avec la natation, la gestion sportive ou ce projet`;


/** Keywords that open the chatbot via the command palette */
const CHAT_TRIGGERS = ['chat', 'chatbot', 'bot', 'assistant', 'aide', 'help'];

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css']
})
export class ChatbotComponent implements OnInit, OnDestroy {
  @ViewChild('cmdInput') cmdInputRef!: ElementRef<HTMLInputElement>;

  isOpen  = false;
  cmdOpen = false;
  cmdQuery = '';
  userInput = '';
  isTyping  = false;

  messages: ChatMessage[] = [
    {
      text: "Bonjour ! 👋 Je suis l'assistant IDSS Natation. Je connais toute la plateforme : nageurs, entraînements, performances, compétitions, classement, cotisations et l'IA IDSS. Comment puis-je vous aider ?",
      sender: 'bot',
      timestamp: new Date()
    }
  ];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    document.addEventListener('keydown', this.onGlobalKeydown);
  }

  ngOnDestroy() {
    document.removeEventListener('keydown', this.onGlobalKeydown);
  }

  private onGlobalKeydown = (event: KeyboardEvent): void => {
    const tag = (event.target as HTMLElement)?.tagName?.toLowerCase();
    const isEditable =
      tag === 'input' ||
      tag === 'textarea' ||
      (event.target as HTMLElement)?.isContentEditable;

    if (event.key === '/' && !isEditable && !this.cmdOpen && !this.isOpen) {
      event.preventDefault();
      this.openCmd();
      return;
    }

    if (event.key === 'Escape') {
      if (this.cmdOpen) { this.closeCmd(); return; }
      if (this.isOpen)  { this.toggleChat(); }
    }
  };

  openCmd() {
    this.cmdOpen = true;
    this.cmdQuery = '';
    setTimeout(() => this.cmdInputRef?.nativeElement?.focus(), 0);
  }

  closeCmd() {
    this.cmdOpen  = false;
    this.cmdQuery = '';
  }

  onCmdKey(event: KeyboardEvent) {
    if (event.key === 'Escape') { this.closeCmd(); return; }
    if (event.key === 'Enter') {
      const q = this.cmdQuery.trim().toLowerCase();
      if (CHAT_TRIGGERS.some(t => q.includes(t))) {
        this.closeCmd();
        this.openChat();
      } else {
        const el = this.cmdInputRef?.nativeElement;
        if (el) {
          el.classList.remove('shake');
          void el.offsetWidth;
          el.classList.add('shake');
        }
      }
    }
  }

  openChat() {
    this.isOpen = true;
    setTimeout(() => {
      (document.getElementById('chatbot-input') as HTMLInputElement)?.focus();
    }, 350);
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
  }

  sendMessage() {
    const text = this.userInput.trim();
    if (!text) return;

    this.messages.push({ text, sender: 'user', timestamp: new Date() });
    this.userInput = '';
    this.isTyping  = true;

    // Build payload for Groq — map bot→assistant, user→user
    const payloadMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...this.messages
        .filter(m => m.sender !== 'bot' || m.text !== this.messages[0].text) // skip greeting from payload
        .map(m => ({
          role: m.sender === 'bot' ? 'assistant' : 'user',
          content: m.text
        }))
    ];

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    });

    this.http.post(GROQ_API_URL, {
      model: GROQ_MODEL,
      messages: payloadMessages,
      temperature: 0.7,
      max_tokens: 600
    }, { headers }).subscribe({
      next: (response: any) => {
        this.isTyping = false;
        const reply = response?.choices?.[0]?.message?.content
          || "Je suis désolé, je n'ai pas pu préparer ma réponse.";
        this.messages.push({ text: reply, sender: 'bot', timestamp: new Date() });
        // Scroll to bottom
        setTimeout(() => {
          const el = document.getElementById('chatbot-messages');
          if (el) el.scrollTop = el.scrollHeight;
        }, 50);
      },
      error: (err: any) => {
        console.error('Groq error:', err);
        this.isTyping = false;
        const errMsg = err?.error?.error?.message || 'Erreur inconnue.';
        this.messages.push({
          text: `⚠️ Erreur: ${errMsg}`,
          sender: 'bot',
          timestamp: new Date()
        });
      }
    });
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') this.sendMessage();
  }
}
