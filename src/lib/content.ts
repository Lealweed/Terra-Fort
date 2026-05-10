import { supabase } from './supabase';

export type TickerItem = {
  text: string;
  price: string;
  imageUrl: string;
};

export type HomeContent = {
  heroTitle: string;
  heroSubtitle: string;
  heroCta: string;
  features: string[];
  tickerItems: TickerItem[];
};

const fallback: HomeContent = {
  heroTitle: 'Força e Construção na Medida Certa.',
  heroSubtitle: 'A maior variedade de materiais para sua obra em Parauapebas. Do alicerce ao acabamento.',
  heroCta: 'Comprar Agora',
  features: ['Entrega Expressa', 'Pagamento Facilitado', 'Atendimento Zap'],
  tickerItems: [
    { text: 'Cimento CP II', price: 'R$ 38,90', imageUrl: 'https://images.unsplash.com/photo-1541888087401-dc91a27e7cb2?q=80&w=100&auto=format&fit=crop' },
    { text: 'Porcelanato Bianco', price: 'R$ 59,90/m²', imageUrl: 'https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?q=80&w=100&auto=format&fit=crop' },
    { text: 'Argamassa ACIII', price: 'R$ 29,90', imageUrl: 'https://images.unsplash.com/photo-1584620658428-ee1bc4b533db?q=80&w=100&auto=format&fit=crop' },
  ],
};

export async function getHomeContent(): Promise<HomeContent> {
  try {
    const { data, error } = await supabase.from('site_content').select('*').in('section_key', ['home.hero', 'home.features', 'home.ticker']);
    if (error || !data) return fallback;

    const hero = data.find((x: any) => x.section_key === 'home.hero') as any;
    const feat = data.find((x: any) => x.section_key === 'home.features') as any;
    const items = feat?.payload?.items || [];
    
    const ticker = data.find((x: any) => x.section_key === 'home.ticker') as any;
    const tickerItems = ticker?.payload?.items || fallback.tickerItems;

    return {
      heroTitle: hero?.title || fallback.heroTitle,
      heroSubtitle: hero?.subtitle || fallback.heroSubtitle,
      heroCta: hero?.cta_text || fallback.heroCta,
      features: [items[0]?.title || fallback.features[0], items[1]?.title || fallback.features[1], items[2]?.title || fallback.features[2]],
      tickerItems,
    };
  } catch {
    return fallback;
  }
}
