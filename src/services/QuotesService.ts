import firestore from '@react-native-firebase/firestore';

export interface MotivationalQuote {
  id: string;
  text: string;
  index: number;
  createdAt: any;
  isActive: boolean;
}

class QuotesService {
  private quotes: MotivationalQuote[] = [];
  private currentIndex: number = 0;

  async fetchQuotes(): Promise<MotivationalQuote[]> {
    try {
      const snapshot = await firestore()
        .collection('motivationalQuotes')
        .where('isActive', '==', true)
        .orderBy('index')
        .get();

      this.quotes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as MotivationalQuote));

      return this.quotes;
    } catch (error) {
      console.error('Error fetching quotes:', error);
      return this.getFallbackQuotes();
    }
  }

  getCurrentQuote(): MotivationalQuote | null {
    if (this.quotes.length === 0) return null;
    return this.quotes[this.currentIndex];
  }

  getNextQuote(): MotivationalQuote | null {
    if (this.quotes.length === 0) return null;
    this.currentIndex = (this.currentIndex + 1) % this.quotes.length;
    return this.quotes[this.currentIndex];
  }

  getPreviousQuote(): MotivationalQuote | null {
    if (this.quotes.length === 0) return null;
    this.currentIndex = this.currentIndex === 0 
      ? this.quotes.length - 1 
      : this.currentIndex - 1;
    return this.quotes[this.currentIndex];
  }

  getRandomQuote(): MotivationalQuote | null {
    if (this.quotes.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * this.quotes.length);
    this.currentIndex = randomIndex;
    return this.quotes[this.currentIndex];
  }

  getQuoteCount(): number {
    return this.quotes.length;
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  private getFallbackQuotes(): MotivationalQuote[] {
    const fallbackQuotes = [
      "You are stronger than you think, braver than you believe, and more capable than you know.",
      "Every woman has the power to protect herself and others. You are that woman.",
      "Your safety is not a luxury, it's a right. Stand strong, stay safe.",
      "Courage doesn't mean you're not afraid. It means you don't let fear stop you.",
      "You are the hero of your own story. Trust your instincts, trust your strength.",
      "Empowered women empower women. Together we are unstoppable.",
      "Your voice matters, your safety matters, you matter.",
      "Strength comes from within. You have everything you need to protect yourself.",
      "Be bold, be brave, be beautiful. You are enough.",
      "Every step you take towards safety is a step towards empowerment."
    ];

    return fallbackQuotes.map((text, index) => ({
      id: `fallback-${index}`,
      text,
      index,
      createdAt: new Date(),
      isActive: true
    }));
  }
}

export default new QuotesService();
