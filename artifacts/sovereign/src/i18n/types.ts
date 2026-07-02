export type Language = 'ar' | 'en' | 'fr' | 'es';

export interface Translations {
  header: {
    features: string;
    howItWorks: string;
    categories: string;
    login: string;
    getStarted: string;
  };
  hero: {
    badge: string;
    title1: string;
    title2: string;
    subtitle: string;
    cta1: string;
    cta2: string;
    trust1: string;
    trust2: string;
    trust3: string;
  };
  categories: {
    title1: string;
    title2: string;
    subtitle: string;
    work: {
      title: string;
      description: string;
    };
    audience: {
      title: string;
      description: string;
    };
    others: {
      title: string;
      description: string;
    };
  };
  features: {
    title1: string;
    title2: string;
    subtitle: string;
    feature1: {
      title: string;
      description: string;
    };
    feature2: {
      title: string;
      description: string;
    };
    feature3: {
      title: string;
      description: string;
    };
    feature4: {
      title: string;
      description: string;
    };
    notification: {
      title: string;
      subtitle: string;
    };
  };
  howItWorks: {
    title1: string;
    title2: string;
    subtitle: string;
    step1: {
      title: string;
      description: string;
    };
    step2: {
      title: string;
      description: string;
    };
    step3: {
      title: string;
      description: string;
    };
  };
  cta: {
    badge: string;
    title: string;
    subtitle: string;
    button1: string;
    button2: string;
  };
  footer: {
    description: string;
    quickLinks: string;
    home: string;
    features: string;
    howItWorks: string;
    pricing: string;
    contactUs: string;
    copyright: string;
  };
  demoModal: {
    persona: {
      name: string;
      role: string;
      followers: string;
      quote: string;
    };
    categories: {
      work: {
        title: string;
        messages: {
          sender1: string;
          preview1: string;
          sender2: string;
          preview2: string;
          sender3: string;
          preview3: string;
        };
        count: string;
      };
      audience: {
        title: string;
        messages: {
          sender1: string;
          preview1: string;
          sender2: string;
          preview2: string;
          sender3: string;
          preview3: string;
        };
        count: string;
      };
      closeOnes: {
        title: string;
        messages: {
          sender1: string;
          preview1: string;
          sender2: string;
          preview2: string;
          sender3: string;
          preview3: string;
        };
        count: string;
      };
    };
    stats: {
      todayMessages: string;
      importantMessages: string;
      timeSaved: string;
      timeSavedValue: string;
    };
    organizedInbox: string;
    ofMessages: string;
    footer: string;
    tryNow: string;
    timeAgo: {
      minutes: string;
      hour: string;
      hours: string;
    };
  };
  auth: {
    login: string;
    signup: string;
    email: string;
    password: string;
    username: string;
    displayName: string;
    loginButton: string;
    signupButton: string;
    noAccount: string;
    hasAccount: string;
    forgotPassword: string;
    or: string;
    errors: {
      invalidEmail: string;
      weakPassword: string;
      userExists: string;
      invalidCredentials: string;
      generic: string;
    };
  };
  search: {
    placeholder: string;
    noResults: string;
    searching: string;
  };
}
