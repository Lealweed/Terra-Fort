import { Product } from '../types';

export const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Cimento CP II-E 32 RS (50kg)',
    brand: 'Votorantim',
    description: 'Cimento de alta resistência inicial. Ideal para obras em geral, rebocos e contra-pisos.',
    category: 'Materiais Brutos',
    price: 39.90,
    original_price: 45.90,
    sob_consulta: false,
    image_url: 'https://images.unsplash.com/photo-1541888087401-dc91a27e7cb2?q=80&w=800&auto=format&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1541888087401-dc91a27e7cb2?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=800&auto=format&fit=crop',
    ],
    features: [
      'Secagem rápida, otimizando o tempo da obra',
      'Alta resistência estrutural e aderência',
      'Versatilidade de aplicação: fundações, pilares, vigas e lajes',
      'Menor índice de fissuração'
    ],
    specifications: {
      'Peso Líquido': '50kg',
      'Validade': '90 dias após a data de fabricação',
      'Norma Técnica': 'ABNT NBR 16697',
      'Tipo': 'CP II-E 32 RS'
    },
    stock_level: 150
  },
  {
    id: '2',
    name: 'Cabo Flexível 2,5mm 750V (100m)',
    brand: 'SIL',
    description: 'Cabo elétrico flexível com isolação em PVC dupla camada. Rolo com 100 metros. Essencial para instalações elétricas seguras.',
    category: 'Elétrica',
    price: 189.90,
    sob_consulta: false,
    image_url: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?q=80&w=800&auto=format&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?q=80&w=800&auto=format&fit=crop'
    ],
    features: [
      'Isolação em PVC tipo BWF (Resistente à propagação de chamas)',
      'Condutor de cobre eletrolítico, têmpera mole, classe 4 ou 5',
      'Ideal para quadros de força, tomadas e iluminação residencial'
    ],
    specifications: {
      'Comprimento': '100 Metros',
      'Seção Nominal': '2,5 mm²',
      'Tensão Nominal': '450/750V',
      'Cores Disponíveis': 'Preto, Vermelho, Azul, Verde, Amarelo, Branco'
    },
    stock_level: 45
  },
  {
    id: '3',
    name: 'Tubo PVC Soldável 25mm (Vara 6m)',
    brand: 'Tigre',
    description: 'Tubo de PVC rígido marrom para condução de água fria em instalações prediais, comerciais e industriais.',
    category: 'Hidráulica',
    price: 32.50,
    sob_consulta: false,
    image_url: 'https://images.unsplash.com/photo-1584620658428-ee1bc4b533db?q=80&w=800&auto=format&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1584620658428-ee1bc4b533db?q=80&w=800&auto=format&fit=crop'
    ],
    features: [
      'Fácil instalação por adesivo plástico',
      'Resistente a produtos químicos e à corrosão',
      'Não altera a potabilidade da água',
      'Garantia de estanqueidade'
    ],
    specifications: {
      'Material': 'PVC Rígido',
      'Bitola': '25mm (3/4")',
      'Comprimento': '6 Metros',
      'Temperatura Máxima': '20°C',
      'Pressão de Serviço': '7,5 kgf/cm² (75 m.c.a)'
    },
    stock_level: 200
  },
  {
    id: '4',
    name: 'Porcelanato Calacata 84x84cm Polido',
    brand: 'Elizabeth',
    description: 'Porcelanato de grande formato reproduzindo o clássico mármore Calacata, ideal para ambientes internos secos de alto padrão, como salas e quartos.',
    category: 'Acabamento',
    price: 69.99,
    original_price: 70.00,
    sob_consulta: false, 
    stock_level: 50,
    image_url: 'https://images.unsplash.com/photo-1549488344-c75c8baf776b?q=80&w=800&auto=format&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1549488344-c75c8baf776b?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?q=80&w=800&auto=format&fit=crop'
    ],
    video_url: 'https://www.w3schools.com/html/mov_bbb.mp4',
    features: [
      'Acabamento Polido (Alto brilho)',
      'Borda Reta (Retificado) permitindo junta mínima de 1.5mm',
      'Alta resistência à mancha d\'água',
      'Fácil limpeza e manutenção'
    ],
    specifications: {
      'Tamanho Nominal': '84x84 cm',
      'M² por caixa': '2,11 m²',
      'Peças por caixa': '3 unidades',
      'Variação de Tonalidade': 'V3 (Variação Moderada)',
      'Espessura': '10mm'
    },
  },
  {
    id: '5',
    name: 'Pia Inox com Cuba 150x55cm',
    brand: 'GhelPlus',
    description: 'Pia de aço inox resistente. Produto durável com escorredor duplo e cuba central.',
    category: 'Acabamento',
    price: 450.00,
    sob_consulta: false,
    image_url: 'https://images.unsplash.com/photo-1584622781564-1d987f7333c1?q=80&w=800&auto=format&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1584622781564-1d987f7333c1?q=80&w=800&auto=format&fit=crop'
    ],
    features: [
      'Produzida em Aço Inox 430 padrão',
      'Acompanha válvula',
      'Possui escorredor canelado que evita o acúmulo de água',
      'Pronta para instalação em balcões de madeira ou alvenaria'
    ],
    specifications: {
      'Dimensões': '150cm (comprimento) x 55cm (largura)',
      'Profundidade da Cuba': '11 cm',
      'Acabamento': 'Brilhante',
      'Furo para torneira': 'Não possui (livre para furação do cliente)'
    },
    stock_level: 5
  },
  {
    id: '6',
    name: 'Areia Lavada Média (Caminhão Fechado 12m³)',
    brand: 'Extração Local',
    description: 'Areia média limpa especial para construção civil, ideal para preparo de concreto e argamassas. Fornecimento via caminhão basculante fechado. Entrega própria em Parauapebas e região.',
    category: 'Materiais Brutos',
    price: 0,
    sob_consulta: true,
    image_url: 'https://images.unsplash.com/photo-1525493036496-e265db2d6e3e?q=80&w=800&auto=format&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1525493036496-e265db2d6e3e?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1628148784277-96a1a1dbfe9a?q=80&w=800&auto=format&fit=crop'
    ],
    features: [
      'Areia livre de impurezas, argilas e materiais orgânicos',
      'Granulometria ideal para tração de concreto',
      'Entrega programada sob demanda para canteiros de obras',
      'Emissão de nota fiscal e controle de pesagem'
    ],
    specifications: {
      'Granulometria': 'Média / Grossa',
      'Volume': '12 Metros Cúbicos',
      'Origem': 'Extração Mineral Certificada local',
      'Frete': 'Incluso para área urbana'
    },
    stock_level: 999
  }
];
