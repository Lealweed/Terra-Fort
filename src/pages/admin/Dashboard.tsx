import { lazy, Suspense, type ReactNode, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, FileText, MessageSquareMore, PackageCheck, Settings, Truck, Users, Wrench, LayoutDashboard, ShoppingBag, PenTool, ChevronLeft, ChevronRight, Boxes, CircleDollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { AdminCustomerDraft, AdminCustomerRow, AdminDriverDraft, AdminDriverRow, AdminOrderEventRow, AdminOrderItemRow, AdminOrderRow, AdminSupportTicketDraft, AdminSupportTicketRow, InventoryMovementRow, ProductDraft, ProductRow } from './admin-types';
import { createProduct as createProductRecord, deleteProduct as deleteProductRecord, emptyProductDraft, listProducts, toProductDraft, updateProduct as updateProductRecord, uploadProductImage } from '../../services/admin/products';
import { createCustomer as createCustomerRecord, listCustomers, toCustomerDraft, updateCustomer as updateCustomerRecord, validateCustomerDraft, deleteCustomer as deleteCustomerRecord } from '../../services/admin/customers';
import { createDriver as createDriverRecord, listDrivers, toDriverDraft, updateDriver as updateDriverRecord, validateDriverDraft } from '../../services/admin/drivers';
import { listOrderEvents, listOrderItems, updateOrderStatusRecord, createAdminOrderRecord, type AdminOrderDraft } from '../../services/admin/orders';
import { saveDeliveryMetaRecord, updateDeliveryStatusRecord, resolveDriverName } from '../../services/admin/delivery';
import { buildFinanceSummary, listFinanceTransactions, saveFinanceTransaction, deleteFinanceTransaction, type AdminFinanceTransactionRow, type AdminFinanceTransactionDraft } from '../../services/admin/finance';
import { listInventoryMovements, saveInventoryAdjustment, type InventoryAdjustmentType } from '../../services/admin/inventory';
import { listSupportTickets, toSupportTicketDraft, updateSupportTicket } from '../../services/admin/support';

type Tab = 'overview' | 'control' | 'catalog' | 'inventory' | 'orders' | 'delivery' | 'customers' | 'support' | 'finance' | 'content' | 'users';
type OrderStatus = 'Pendente' | 'Pago' | 'Em rota de entrega' | 'Cancelado' | 'Concluído';
type DeliveryStatus = OrderStatus;
type Role = 'admin' | 'delivery' | 'customer';


type OrderRow = AdminOrderRow;

type AdminUser = {
  id: string;
  email: string;
  role: Role | 'unknown';
  created_at: string;
  last_sign_in_at?: string | null;
};

type CustomerRow = AdminCustomerRow;
type DriverRow = AdminDriverRow;

type ContentState = {
  heroTitle: string;
  heroSubtitle: string;
  heroCta: string;
  f1: string;
  f2: string;
  f3: string;
  t1Text: string;
  t1Price: string;
  t1Image: string;
  t2Text: string;
  t2Price: string;
  t2Image: string;
  t3Text: string;
  t3Price: string;
  t3Image: string;
};

const orderStatuses: OrderStatus[] = ['Pendente', 'Pago', 'Em rota de entrega', 'Cancelado', 'Concluído'];
const deliveryStatuses: DeliveryStatus[] = [...orderStatuses];

const AdminCatalogPage = lazy(() => import('./AdminCatalogPage'));
const AdminControlPage = lazy(() => import('./AdminControlPage'));
const AdminCustomersPage = lazy(() => import('./AdminCustomersPage'));
const AdminDeliveryPage = lazy(() => import('./AdminDeliveryPage'));
const AdminFinancePage = lazy(() => import('./AdminFinancePage'));
const AdminInventoryPage = lazy(() => import('./AdminInventoryPage'));
const AdminOrdersPage = lazy(() => import('./AdminOrdersPage'));
const AdminSupportPage = lazy(() => import('./AdminSupportPage'));

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [supportTickets, setSupportTickets] = useState<AdminSupportTicketRow[]>([]);
  const [orderEvents, setOrderEvents] = useState<AdminOrderEventRow[]>([]);
  const [orderItems, setOrderItems] = useState<AdminOrderItemRow[]>([]);
  const [financeTransactions, setFinanceTransactions] = useState<AdminFinanceTransactionRow[]>([]);

  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedSupportTicketId, setSelectedSupportTicketId] = useState('');
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [draftProduct, setDraftProduct] = useState<ProductDraft>(emptyProductDraft);
  const [draftCustomer, setDraftCustomer] = useState<AdminCustomerDraft>(toCustomerDraft());
  const [draftDriver, setDraftDriver] = useState<AdminDriverDraft>(toDriverDraft());
  const [draftSupportTicket, setDraftSupportTicket] = useState<AdminSupportTicketDraft>(toSupportTicketDraft());
  const [selectedDriverAdminId, setSelectedDriverAdminId] = useState('');
  const [productMovements, setProductMovements] = useState<InventoryMovementRow[]>([]);

  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<Role>('customer');

  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('todos');
  const [customerSearch, setCustomerSearch] = useState('');
  const [supportSearch, setSupportSearch] = useState('');
  const [supportStatusFilter, setSupportStatusFilter] = useState<string>('todos');

  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [content, setContent] = useState<ContentState>({
    heroTitle: 'Força e Construção na Medida Certa.',
    heroSubtitle: 'Encontre tudo para sua obra: do básico ao acabamento. Qualidade que você confia, entrega que você precisa.',
    heroCta: 'Comprar Agora',
    f1: 'Entrega Expressa',
    f2: 'Pagamento Facilitado',
    f3: 'Atendimento Zap',
    t1Text: 'Cimento CP II', t1Price: 'R$ 38,90', t1Image: 'https://images.unsplash.com/photo-1541888087401-dc91a27e7cb2?q=80&w=100&auto=format&fit=crop',
    t2Text: 'Porcelanato Bianco', t2Price: 'R$ 59,90/m²', t2Image: 'https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?q=80&w=100&auto=format&fit=crop',
    t3Text: 'Argamassa ACIII', t3Price: 'R$ 29,90', t3Image: 'https://images.unsplash.com/photo-1584620658428-ee1bc4b533db?q=80&w=100&auto=format&fit=crop',
  });

  const money = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
  const selectedProduct = useMemo(() => products.find((p) => p.id === selectedProductId), [products, selectedProductId]);
  const selectedOrder = useMemo(() => orders.find((o) => o.id === selectedOrderId), [orders, selectedOrderId]);
  const selectedSupportTicket = useMemo(() => supportTickets.find((ticket) => ticket.id === selectedSupportTicketId) || null, [supportTickets, selectedSupportTicketId]);

  const loadProducts = async () => {
    const list = await listProducts();
    setProducts(list);
    setSelectedProductId((prev) => list.find((x) => x.id === prev)?.id || list[0]?.id || '');
  };

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id,order_code,customer_name,customer_phone,customer_email,status,total,payment_status,created_at,assigned_driver_id,delivery_address')
        .order('created_at', { ascending: false })
        .limit(300);
      
      if (error) throw error;
      
      const list = (data || []) as OrderRow[];
      setOrders(list);
      setSelectedOrderId((prev) => list.find((x) => x.id === prev)?.id || list[0]?.id || '');
    } catch (e: any) {
      setMsg(`Erro ao carregar pedidos: ${e.message}`);
    }
  };

  const loadDrivers = async () => {
    const data = await listDrivers();
    setDrivers(data);
    setSelectedDriverAdminId((prev) => data.find((x) => x.id === prev)?.id || data[0]?.id || '');
  };

  const loadTransactions = async () => {
    try {
      const data = await listFinanceTransactions();
      setFinanceTransactions(data);
    } catch (error) {
      console.error('Erro ao carregar transações financeiras:', error);
    }
  };

  const handleSaveTransaction = async (draft: AdminFinanceTransactionDraft) => {
    try {
      await saveFinanceTransaction(draft);
      setMsg('Transação financeira adicionada!');
      await loadTransactions();
    } catch (error: any) {
      setMsg(`Erro ao adicionar transação: ${error.message}`);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Excluir esta transação?')) return;
    try {
      await deleteFinanceTransaction(id);
      setMsg('Transação financeira excluída!');
      await loadTransactions();
    } catch (error: any) {
      setMsg(`Erro ao excluir transação: ${error.message}`);
    }
  };

  const loadCustomers = async () => {
    const data = await listCustomers();
    setCustomers(data);
  };

  const loadSupport = async () => {
    const data = await listSupportTickets();
    setSupportTickets(data);
    setSelectedSupportTicketId((prev) => data.find((x) => x.id === prev)?.id || data[0]?.id || '');
  };

  const selectedCustomer = useMemo(() => customers.find(c => c.id === selectedCustomerId), [customers, selectedCustomerId]);
  const selectedDriverAdmin = useMemo(() => drivers.find((driver) => driver.id === selectedDriverAdminId), [drivers, selectedDriverAdminId]);

  const authHeaders = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const loadUsers = async () => {
    try {
      const headers = await authHeaders();
      const response = await fetch('/api/admin/users', { headers });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha ao buscar usuários');
      setUsers(data.users || []);
    } catch (e: any) {
      setMsg(`Usuários: ${e.message}`);
    }
  };

  const loadOrderEvents = async (orderId: string) => {
    const data = await listOrderEvents(orderId);
    setOrderEvents(data);
  };

  const loadOrderItems = async (orderId: string) => {
    const data = await listOrderItems(orderId);
    setOrderItems(data);
  };

  const loadContent = async () => {
    const { data } = await supabase.from('site_content').select('*').in('section_key', ['home.hero', 'home.features', 'home.ticker']);
    const hero = (data || []).find((x) => x.section_key === 'home.hero') as any;
    const feat = (data || []).find((x) => x.section_key === 'home.features') as any;
    const ticker = (data || []).find((x) => x.section_key === 'home.ticker') as any;
    const items = feat?.payload?.items || [];
    const tItems = ticker?.payload?.items || [];
    setContent((c) => ({
      ...c,
      heroTitle: hero?.title || c.heroTitle,
      heroSubtitle: hero?.subtitle || c.heroSubtitle,
      heroCta: hero?.cta_text || c.heroCta,
      f1: items[0]?.title || c.f1,
      f2: items[1]?.title || c.f2,
      f3: items[2]?.title || c.f3,
      t1Text: tItems[0]?.text || c.t1Text, t1Price: tItems[0]?.price || c.t1Price, t1Image: tItems[0]?.imageUrl || c.t1Image,
      t2Text: tItems[1]?.text || c.t2Text, t2Price: tItems[1]?.price || c.t2Price, t2Image: tItems[1]?.imageUrl || c.t2Image,
      t3Text: tItems[2]?.text || c.t3Text, t3Price: tItems[2]?.price || c.t3Price, t3Image: tItems[2]?.imageUrl || c.t3Image,
    }));
  };

  useEffect(() => {
    Promise.all([loadProducts(), loadOrders(), loadCustomers(), loadDrivers(), loadSupport(), loadUsers(), loadContent(), loadTransactions()]).finally(() => setLoading(false));
  }, []);

  const loadProductMovements = async (pid: string) => {
    const data = await listInventoryMovements(pid);
    setProductMovements(data);
  };

  useEffect(() => {
    if (selectedProduct) {
      setDraftProduct(toProductDraft(selectedProduct));
      loadProductMovements(selectedProduct.id);
    }
  }, [selectedProductId, selectedProduct]);

  useEffect(() => {
    if (selectedOrderId) {
      loadOrderEvents(selectedOrderId);
      loadOrderItems(selectedOrderId);
    }
  }, [selectedOrderId]);

  useEffect(() => {
    if (isCreatingCustomer) {
      setDraftCustomer(toCustomerDraft());
    } else if (selectedCustomer) {
      setDraftCustomer(toCustomerDraft(selectedCustomer));
    } else {
      setDraftCustomer(toCustomerDraft());
    }
  }, [isCreatingCustomer, selectedCustomerId, selectedCustomer]);

  useEffect(() => {
    if (selectedDriverAdmin) {
      setDraftDriver(toDriverDraft(selectedDriverAdmin));
    } else {
      setDraftDriver(toDriverDraft());
    }
  }, [selectedDriverAdminId, selectedDriverAdmin]);

  useEffect(() => {
    setDraftSupportTicket(toSupportTicketDraft(selectedSupportTicket));
  }, [selectedSupportTicket]);

  const saveCustomer = async () => {
    setMsg('');
    const validationError = validateCustomerDraft(draftCustomer);
    if (validationError) return setMsg(validationError);

    try {
      if (isCreatingCustomer) {
        const created = await createCustomerRecord(draftCustomer);
        setSelectedCustomerId(created.id);
        setIsCreatingCustomer(false);
        setMsg('Cliente criado com sucesso.');
      } else {
        if (!selectedCustomerId) return setMsg('Selecione um cliente para salvar.');
        await updateCustomerRecord(selectedCustomerId, draftCustomer);
        setMsg('Cliente atualizado com sucesso.');
      }
      await loadCustomers();
    } catch (error: any) {
      setMsg(`Erro ao salvar cliente: ${error.message}`);
    }
  };

  const handleNewCustomer = () => {
    setSelectedCustomerId('');
    setIsCreatingCustomer(true);
    setDraftCustomer(toCustomerDraft());
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!confirm('Deseja realmente deletar este cliente? Esta ação não pode ser desfeita e pode afetar pedidos associados.')) return;
    try {
      await deleteCustomerRecord(id);
      setMsg('Cliente excluído com sucesso.');
      setSelectedCustomerId('');
      await loadCustomers();
    } catch (error: any) {
      setMsg(`Erro ao excluir cliente: ${error.message}`);
    }
  };

  const saveStockAdjustment = async (movementType: InventoryAdjustmentType, quantity: number, reason: string) => {
    if (!selectedProductId || !selectedProduct) {
      setMsg('Selecione um produto para ajustar o estoque.');
      return false;
    }

    try {
      await saveInventoryAdjustment({
        productId: selectedProductId,
        currentStock: selectedProduct.stock_level,
        movementType,
        quantity,
        reason,
      });
      setMsg('Estoque ajustado com sucesso.');
      await loadProducts();
      await loadProductMovements(selectedProductId);
      return true;
    } catch (error: any) {
      setMsg(`Erro ao ajustar estoque: ${error.message}`);
      return false;
    }
  };

  const createProduct = async () => {
    setMsg('');
    if (!draftProduct.name || !draftProduct.category) return setMsg('Nome e categoria são obrigatórios.');
    try {
      await createProductRecord(draftProduct);
      setMsg('Produto criado.');
      setDraftProduct(emptyProductDraft);
      await loadProducts();
    } catch (error: any) {
      setMsg(`Erro: ${error.message}`);
    }
  };

  const saveProduct = async () => {
    if (!selectedProductId) return;
    try {
      await updateProductRecord(selectedProductId, draftProduct);
      setMsg('Produto atualizado.');
      await loadProducts();
    } catch (error: any) {
      setMsg(`Erro: ${error.message}`);
    }
  };

  const deleteProduct = async () => {
    if (!selectedProductId) return;
    if (!confirm('Excluir produto?')) return;
    try {
      await deleteProductRecord(selectedProductId);
      setMsg('Produto excluído.');
      await loadProducts();
    } catch (error: any) {
      setMsg(`Erro: ${error.message}`);
    }
  };

  const handleNewProduct = () => {
    setSelectedProductId('');
    setDraftProduct(emptyProductDraft);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingImage(true);
    setMsg('Fazendo upload da imagem...');
    
    try {
      const publicUrl = await uploadProductImage(file);
      setDraftProduct((d) => ({ ...d, image_url: publicUrl }));

      if (selectedProductId) {
        await updateProductRecord(selectedProductId, { ...draftProduct, image_url: publicUrl });
        await loadProducts();
      }

      setMsg('Upload concluído e salvo com sucesso!');
    } catch (error: any) {
      setMsg(`Erro no upload: ${error.message}`);
    } finally {
      setUploadingImage(false);
    }
  };

  const updateOrderStatus = async (status: OrderStatus) => {
    if (!selectedOrderId) return;
    try {
      await updateOrderStatusRecord(selectedOrderId, status);
      setMsg('Status do pedido atualizado.');
      await loadOrders();
      await loadOrderEvents(selectedOrderId);
    } catch (error: any) {
      setMsg(`Erro: ${error.message}`);
    }
  };

  const handleCreateOrder = async (draft: AdminOrderDraft) => {
    const orderId = await createAdminOrderRecord(draft);
    setMsg('Pedido criado com sucesso!');
    await loadOrders();
    setSelectedOrderId(orderId);
  };

  const updateDeliveryStatus = async (status: DeliveryStatus) => {
    if (!selectedOrderId) return;
    try {
      await updateDeliveryStatusRecord(selectedOrderId, status);
      setMsg('Logística atualizada.');
      await loadOrders();
      await loadOrderEvents(selectedOrderId);
    } catch (error: any) {
      setMsg(`Erro: ${error.message}`);
    }
  };

  const saveDeliveryMeta = async (driverId: string, note: string) => {
    if (!selectedOrder) return;
    try {
      const legacyDriverName = typeof selectedOrder.delivery_address?.driver_name === 'string' ? selectedOrder.delivery_address.driver_name : '';
      const driverName = resolveDriverName(driverId, drivers, legacyDriverName);
      await saveDeliveryMetaRecord(selectedOrder.id, selectedOrder.delivery_address, driverId, driverName, note);
      setMsg('Dados de entrega salvos.');
      await loadOrders();
      await loadOrderEvents(selectedOrder.id);
    } catch (error: any) {
      setMsg(`Erro: ${error.message}`);
    }
  };

  const saveDriver = async () => {
    setMsg('');
    const validationError = validateDriverDraft(draftDriver);
    if (validationError) return setMsg(validationError);

    try {
      if (selectedDriverAdminId) {
        await updateDriverRecord(selectedDriverAdminId, draftDriver);
        setMsg('Entregador atualizado com sucesso.');
      } else {
        const created = await createDriverRecord(draftDriver);
        setSelectedDriverAdminId(created.id);
        setMsg('Entregador cadastrado com sucesso.');
      }
      await loadDrivers();
    } catch (error: any) {
      setMsg(`Erro ao salvar entregador: ${error.message}`);
    }
  };

  const saveSupport = async () => {
    if (!selectedSupportTicketId) return setMsg('Selecione um ticket para salvar.');
    setMsg('');

    try {
      await updateSupportTicket(selectedSupportTicketId, draftSupportTicket);
      setMsg('Atendimento atualizado com sucesso.');
      await loadSupport();
    } catch (error: any) {
      setMsg(`Erro ao salvar atendimento: ${error.message}`);
    }
  };

  const saveContent = async () => {
    const { error: e1 } = await supabase.from('site_content').upsert({
      section_key: 'home.hero',
      title: content.heroTitle,
      subtitle: content.heroSubtitle,
      cta_text: content.heroCta,
      payload: {},
    }, { onConflict: 'section_key' });
    if (e1) return setMsg(`Erro: ${e1.message}`);

    const { error: e2 } = await supabase.from('site_content').upsert({
      section_key: 'home.features',
      title: 'Destaques',
      payload: { items: [{ title: content.f1 }, { title: content.f2 }, { title: content.f3 }] },
    }, { onConflict: 'section_key' });
    if (e2) return setMsg(`Erro: ${e2.message}`);

    const { error: e3 } = await supabase.from('site_content').upsert({
      section_key: 'home.ticker',
      title: 'Ofertas da Semana',
      payload: { items: [
        { text: content.t1Text, price: content.t1Price, imageUrl: content.t1Image },
        { text: content.t2Text, price: content.t2Price, imageUrl: content.t2Image },
        { text: content.t3Text, price: content.t3Price, imageUrl: content.t3Image }
      ] },
    }, { onConflict: 'section_key' });
    if (e3) return setMsg(`Erro: ${e3.message}`);

    setMsg('Conteúdo salvo.');
  };

  const createUser = async () => {
    if (!newUserEmail || !newUserPassword) return setMsg('Informe e-mail e senha.');
    const headers = await authHeaders();
    const response = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify({ email: newUserEmail, password: newUserPassword, role: newUserRole }),
    });
    const data = await response.json();
    if (!response.ok) return setMsg(`Erro: ${data.error || 'falha'}`);
    setMsg('Usuário criado.');
    setNewUserEmail('');
    setNewUserPassword('');
    setNewUserRole('customer');
    loadUsers();
  };

  const updateUserRole = async (id: string, role: Role) => {
    const headers = await authHeaders();
    const response = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify({ id, role }),
    });
    const data = await response.json();
    if (!response.ok) return setMsg(`Erro: ${data.error || 'falha'}`);
    setMsg('Perfil atualizado.');
    loadUsers();
  };

  const stats = useMemo(() => {
    const finance = buildFinanceSummary(orders);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const faturamentoMes = orders
      .filter((o) => new Date(o.created_at) >= monthStart && o.status !== 'Cancelado')
      .reduce((acc, o) => acc + Number(o.total || 0), 0);

    const ordersByStatus = orderStatuses.map((s) => ({
      label: s,
      value: orders.filter((o) => o.status === s).length,
    }));

    const categoryMap = new Map<string, number>();
    products.forEach((p) => categoryMap.set(p.category, (categoryMap.get(p.category) || 0) + 1));
    const productsByCategory = Array.from(categoryMap.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);

    return {
      products: products.length,
      orders: orders.length,
      customers: customers.length,
      deliveries: orders.filter((o) => String(o.status).toLowerCase().includes('rota')).length,
      stockCritical: products.filter((p) => p.stock_level <= 5).length,
      faturamentoMes,
      receivedRevenue: finance.receivedRevenue,
      pendingRevenue: finance.pendingRevenue,
      ordersByStatus,
      productsByCategory,
      homeProducts: products.filter((p) => p.is_active),
    };
  }, [products, orders, customers]);

  const TABS_CONFIG = [
    { id: 'overview', label: 'Visão Geral', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'control', label: 'Controle', icon: <CircleDollarSign className="w-5 h-5" /> },
    { id: 'catalog', label: 'Catálogo', icon: <ShoppingBag className="w-5 h-5" /> },
    { id: 'inventory', label: 'Estoque', icon: <Boxes className="w-5 h-5" /> },
    { id: 'orders', label: 'Pedidos', icon: <PackageCheck className="w-5 h-5" /> },
    { id: 'delivery', label: 'Logística', icon: <Truck className="w-5 h-5" /> },
    { id: 'customers', label: 'Clientes', icon: <Users className="w-5 h-5" /> },
    { id: 'support', label: 'Atendimento', icon: <MessageSquareMore className="w-5 h-5" /> },
    { id: 'finance', label: 'Financeiro', icon: <FileText className="w-5 h-5" /> },
    { id: 'content', label: 'Conteúdo', icon: <PenTool className="w-5 h-5" /> },
    { id: 'users', label: 'Usuários', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-gray-800 font-sans overflow-hidden">
      {/* SIDEBAR */}
      <aside className={`${isSidebarOpen ? 'w-72' : 'w-20'} bg-[#0F172A] text-gray-300 flex flex-col shadow-2xl z-30 shrink-0 transition-all duration-300 relative group`}>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="absolute -right-3 top-8 bg-brand-orange hover:bg-orange-600 text-white rounded-full p-1 shadow-md z-40 transition-colors">
          {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        <div className={`p-6 font-black text-white text-3xl tracking-tighter flex items-center gap-2 border-b border-white/10 ${!isSidebarOpen && 'justify-center p-4'}`}>
          {isSidebarOpen ? (
            <><span className="text-brand-orange">Terra</span>Fort <span className="text-[10px] bg-white/10 px-2 py-1 rounded-full text-gray-400 font-bold uppercase tracking-widest ml-1">Admin</span></>
          ) : (
            <span className="text-brand-orange text-xl">TF</span>
          )}
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto overflow-x-hidden">
          {TABS_CONFIG.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as Tab)}
              title={!isSidebarOpen ? t.label : ''}
              className={`w-full flex items-center gap-3 ${isSidebarOpen ? 'px-4 py-3.5' : 'justify-center p-3.5'} rounded-xl font-bold transition-all duration-300 ${activeTab === t.id ? 'bg-brand-orange text-white shadow-lg shadow-brand-orange/30 translate-x-1' : 'hover:bg-white/5 hover:text-white hover:translate-x-1'}`}
            >
              {t.icon}
              {isSidebarOpen && <span className="whitespace-nowrap">{t.label}</span>}
            </button>
          ))}
        </nav>
        <div className="p-6 border-t border-white/10 bg-white/5">
          <button onClick={() => window.location.href='/'} className={`flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-white transition-colors ${!isSidebarOpen && 'justify-center w-full'}`} title={!isSidebarOpen ? 'Voltar para Loja' : ''}>
            {!isSidebarOpen ? <LayoutDashboard className="w-5 h-5"/> : '← Voltar para Loja'}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Subtle background decoration */}
        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-brand-orange/5 to-transparent pointer-events-none" />
        
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/80 h-20 flex items-center px-8 shrink-0 shadow-sm z-10 sticky top-0">
          <h1 className="text-2xl font-black text-gray-900">{TABS_CONFIG.find(t => t.id === activeTab)?.label}</h1>
        </header>

        <div className="flex-1 overflow-auto p-8 relative z-0">
          <div className="max-w-7xl mx-auto space-y-8 pb-12 animate-fade-in">
            {msg && (
              <div className="bg-blue-50 text-blue-800 border border-blue-200 rounded-xl px-5 py-4 text-sm font-medium flex items-center justify-between shadow-sm animate-pulse-once">
                <span>{msg}</span>
                <button onClick={() => setMsg('')} className="font-bold text-blue-400 hover:text-blue-800 transition-colors">✕</button>
              </div>
            )}

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card title="Produtos" value={String(stats.products)} icon={<Wrench className="w-5 h-5" />} />
              <Card title="Pedidos" value={String(stats.orders)} icon={<PackageCheck className="w-5 h-5" />} />
              <Card title="Clientes" value={String(stats.customers)} icon={<Users className="w-5 h-5" />} />
              <Card title="Em rota" value={String(stats.deliveries)} icon={<Truck className="w-5 h-5" />} />
              <Card title="Estoque crítico" value={String(stats.stockCritical)} icon={<AlertTriangle className="w-5 h-5" />} />
              <Card title="Faturamento mês" value={money(stats.faturamentoMes)} icon={<FileText className="w-5 h-5" />} />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <ChartCard title="Pedidos por status" data={stats.ordersByStatus} color="bg-blue-500" />
              <ChartCard title="Produtos por categoria" data={stats.productsByCategory} color="bg-orange-500" />
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-200/60">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-gray-900">Vitrine da Loja (Home)</h3>
                <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold">{stats.homeProducts.length} produtos ativos</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {stats.homeProducts.slice(0, 12).map((p) => {
                  const hasPromo = p.original_price && p.original_price > p.price;
                  const discount = hasPromo ? Math.round((1 - p.price / p.original_price!) * 100) : 0;
                  
                  return (
                    <div key={p.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group cursor-pointer" onClick={() => { setActiveTab('catalog'); setSelectedProductId(p.id); }}>
                      <div className="relative aspect-square bg-gray-50 flex items-center justify-center p-4">
                        {/* Badges */}
                        <div className="absolute top-3 w-full px-3 flex justify-between items-start z-10">
                          <div className="flex flex-col gap-1 items-start">
                            {hasPromo && <span className="bg-red-500 text-white text-[9px] font-black uppercase px-2 py-1 rounded shadow-sm tracking-wider">Promoção</span>}
                            {p.category && <span className="bg-white/90 text-gray-800 text-[9px] font-bold uppercase px-2 py-1 rounded shadow-sm tracking-wider border border-gray-200 backdrop-blur-sm">{p.category}</span>}
                          </div>
                          {p.stock_level > 0 ? (
                            <span className="bg-green-100 text-green-700 text-[9px] font-black uppercase px-2 py-1 rounded border border-green-200 tracking-wider">Em Estoque</span>
                          ) : (
                            <span className="bg-red-100 text-red-700 text-[9px] font-black uppercase px-2 py-1 rounded border border-red-200 tracking-wider">Esgotado</span>
                          )}
                        </div>
                        
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="text-gray-300 text-xs text-center">Imagem<br/>indisponível</div>
                        )}
                      </div>
                      
                      <div className="p-5 flex flex-col flex-1">
                        <h4 className="font-bold text-gray-900 line-clamp-2 leading-snug flex-1 group-hover:text-brand-orange transition-colors">{p.name}</h4>
                        {p.description && <p className="text-xs text-gray-500 line-clamp-2 mt-1 mb-3">{p.description}</p>}
                        
                        <div className="mt-auto pt-3 flex items-end justify-between border-t border-gray-50">
                          <div>
                            {hasPromo && <p className="text-xs text-gray-400 line-through font-medium mb-0.5">{money(p.original_price!)}</p>}
                            <p className="text-xl font-black text-gray-900 leading-none">{money(p.price)}</p>
                          </div>
                          {hasPromo && <span className="bg-green-100 text-green-700 font-bold text-xs px-2 py-0.5 rounded-md">-{discount}%</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <Suspense fallback={<AdminTabFallback tab={activeTab} />}>
          {activeTab === 'control' && (
          <AdminControlPage
            orders={orders}
            products={products}
            onOpenOrder={(orderId, targetTab = 'orders') => {
              setSelectedOrderId(orderId);
              setActiveTab(targetTab);
            }}
            onOpenInventory={(productId) => {
              setSelectedProductId(productId);
              setActiveTab('inventory');
            }}
          />
        )}

        {activeTab === 'catalog' && (
          <AdminCatalogPage
            loading={loading}
            products={products}
            selectedProductId={selectedProductId}
            draftProduct={draftProduct}
            uploadingImage={uploadingImage}
            onSelectProduct={setSelectedProductId}
            onNewProduct={handleNewProduct}
            onDraftChange={(updater) => setDraftProduct((current) => updater(current))}
            onCreateProduct={createProduct}
            onSaveProduct={saveProduct}
            onDeleteProduct={deleteProduct}
            onImageUpload={handleImageUpload}
            onOpenInventory={(productId) => {
              if (productId) setSelectedProductId(productId);
              setActiveTab('inventory');
            }}
          />
        )}

        {activeTab === 'inventory' && (
          <AdminInventoryPage
            products={products}
            selectedProductId={selectedProductId}
            productMovements={productMovements}
            onSelectProduct={setSelectedProductId}
            onSaveAdjustment={saveStockAdjustment}
            onNewProduct={() => {
              handleNewProduct();
              setActiveTab('catalog');
            }}
          />
        )}

        {activeTab === 'orders' && (
          <AdminOrdersPage
            products={products}
            orders={orders}
            drivers={drivers}
            selectedOrderId={selectedOrderId}
            orderSearch={orderSearch}
            orderStatusFilter={orderStatusFilter}
            selectedOrder={selectedOrder}
            orderItems={orderItems}
            orderEvents={orderEvents}
            orderStatuses={orderStatuses}
            onSearchChange={setOrderSearch}
            onStatusFilterChange={setOrderStatusFilter}
            onSelectOrder={setSelectedOrderId}
            onUpdateOrderStatus={updateOrderStatus}
            onOpenDeliveryTab={() => setActiveTab('delivery')}
            onCreateOrder={handleCreateOrder}
          />
        )}

        {activeTab === 'delivery' && (
          <AdminDeliveryPage
            order={selectedOrder}
            drivers={drivers}
            draftDriver={draftDriver}
            selectedDriverAdminId={selectedDriverAdminId}
            deliveryStatuses={deliveryStatuses}
            onStatusChange={updateDeliveryStatus}
            onSaveMeta={saveDeliveryMeta}
            onDriverDraftChange={(updater) => setDraftDriver((current) => updater(current))}
            onSelectDriverAdmin={setSelectedDriverAdminId}
            onSaveDriver={saveDriver}
            onNewDriver={() => {
              setSelectedDriverAdminId('');
              setDraftDriver(toDriverDraft());
            }}
          />
        )}

        {activeTab === 'customers' && (
          <AdminCustomersPage
            customers={customers}
            orders={orders}
            selectedCustomerId={selectedCustomerId}
            draftCustomer={draftCustomer}
            search={customerSearch}
            onSearchChange={setCustomerSearch}
            onSelectCustomer={(customerId) => {
              setSelectedCustomerId(customerId);
              setIsCreatingCustomer(false);
            }}
            onDraftChange={(updater) => setDraftCustomer((current) => updater(current))}
            onSaveCustomer={saveCustomer}
            onCreateCustomer={handleNewCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            isCreatingCustomer={isCreatingCustomer}
            onOpenOrder={(orderId) => {
              setSelectedOrderId(orderId);
              setActiveTab('orders');
            }}
          />
        )}

        {activeTab === 'support' && (
          <AdminSupportPage
            tickets={supportTickets}
            selectedTicketId={selectedSupportTicketId}
            search={supportSearch}
            statusFilter={supportStatusFilter}
            draftTicket={draftSupportTicket}
            onSearchChange={setSupportSearch}
            onStatusFilterChange={setSupportStatusFilter}
            onSelectTicket={setSelectedSupportTicketId}
            onDraftChange={(updater) => setDraftSupportTicket((current) => updater(current))}
            onSaveTicket={saveSupport}
          />
        )}

        {activeTab === 'finance' && (
          <AdminFinancePage
            orders={orders}
            transactions={financeTransactions}
            onOpenOrder={(orderId) => {
              setSelectedOrderId(orderId);
              setActiveTab('orders');
            }}
            onSaveTransaction={handleSaveTransaction}
            onDeleteTransaction={handleDeleteTransaction}
          />
        )}
        </Suspense>

        {activeTab === 'content' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-3xl space-y-6">
            <div className="flex items-center gap-2"><Settings className="w-5 h-5 text-brand-orange" /><h3 className="font-black text-lg">Conteúdo da Home</h3></div>
            
            <div className="space-y-4 border-b pb-6">
              <h4 className="font-bold text-gray-700">Seção Principal (Hero)</h4>
              <Input label="Título" value={content.heroTitle} onChange={(v) => setContent((c) => ({ ...c, heroTitle: v }))} />
              <Input label="Subtítulo" value={content.heroSubtitle} onChange={(v) => setContent((c) => ({ ...c, heroSubtitle: v }))} />
              <Input label="Texto do Botão (CTA)" value={content.heroCta} onChange={(v) => setContent((c) => ({ ...c, heroCta: v }))} />
            </div>

            <div className="space-y-4 border-b pb-6">
              <h4 className="font-bold text-gray-700">Destaques (Features)</h4>
              <Input label="Destaque 1" value={content.f1} onChange={(v) => setContent((c) => ({ ...c, f1: v }))} />
              <Input label="Destaque 2" value={content.f2} onChange={(v) => setContent((c) => ({ ...c, f2: v }))} />
              <Input label="Destaque 3" value={content.f3} onChange={(v) => setContent((c) => ({ ...c, f3: v }))} />
            </div>

            <div className="space-y-4 border-b pb-6">
              <h4 className="font-bold text-gray-700">Ofertas da Semana (Ticker/Letreiro)</h4>
              <div className="grid grid-cols-1 gap-6">
                {[1, 2, 3].map((num) => (
                  <div key={num} className="p-5 bg-gray-50 border border-gray-100 rounded-2xl shadow-sm space-y-4 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-brand-orange"></div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <h5 className="font-black text-brand-black flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-orange-100 text-brand-orange flex items-center justify-center text-xs">{num}</span> 
                        Produto {num}
                      </h5>
                      <select 
                        onChange={(e) => {
                          const p = products.find(x => x.id === e.target.value);
                          if (p) {
                            setContent(c => ({
                              ...c,
                              [`t${num}Text`]: p.name,
                              [`t${num}Price`]: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.price),
                              [`t${num}Image`]: p.image_url
                            }));
                          }
                          e.target.value = '';
                        }}
                        className="border border-gray-200 bg-white rounded-lg text-sm px-4 py-2 font-medium focus:ring-4 focus:ring-brand-orange/10 focus:border-brand-orange outline-none transition-all cursor-pointer"
                      >
                        <option value="">🔄 Preencher direto do Catálogo...</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Input label="Texto Exibido" value={content[`t${num}Text` as keyof typeof content] as string} onChange={(v) => setContent((c) => ({ ...c, [`t${num}Text`]: v }))} />
                      <Input label="Preço (Opcional)" value={content[`t${num}Price` as keyof typeof content] as string} onChange={(v) => setContent((c) => ({ ...c, [`t${num}Price`]: v }))} />
                      <Input label="Link da Imagem" value={content[`t${num}Image` as keyof typeof content] as string} onChange={(v) => setContent((c) => ({ ...c, [`t${num}Image`]: v }))} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={saveContent} className="bg-brand-black text-white px-5 py-2.5 rounded-lg text-sm font-bold w-full">Salvar todo o conteúdo</button>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
              <h3 className="font-black text-lg">Cadastrar usuário</h3>
              <Input label="E-mail" value={newUserEmail} onChange={setNewUserEmail} />
              <Input label="Senha" value={newUserPassword} onChange={setNewUserPassword} type="password" />
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Perfil</label>
                <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value as Role)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="admin">Admin</option>
                  <option value="delivery">Entregador</option>
                  <option value="customer">Cliente</option>
                </select>
              </div>
              <button onClick={createUser} className="bg-brand-black text-white px-5 py-2 rounded-lg text-sm font-bold">Criar usuário</button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-black text-lg mb-3">Usuários cadastrados</h3>
              <div className="space-y-3 max-h-[460px] overflow-auto">
                {users.map((u) => (
                  <div key={u.id} className="border border-gray-200 rounded-lg p-3">
                    <p className="font-semibold text-sm">{u.email}</p>
                    <p className="text-xs text-gray-500">Último acesso: {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString('pt-BR') : 'nunca'}</p>
                    <select value={u.role} onChange={(e) => updateUserRole(u.id, e.target.value as Role)} className="mt-2 border border-gray-200 rounded px-2 py-1 text-xs">
                      <option value="admin">admin</option>
                      <option value="delivery">delivery</option>
                      <option value="customer">customer</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
          </div>
        </div>
      </main>
    </div>
  );
}

function AdminTabFallback({ tab }: { tab: Tab }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wider text-gray-400">Carregando módulo</p>
      <h3 className="font-black text-lg text-gray-900 mt-2">Aba: {tab}</h3>
      <div className="mt-4 space-y-3 animate-pulse">
        <div className="h-4 bg-gray-100 rounded w-1/3" />
        <div className="h-24 bg-gray-100 rounded-2xl" />
        <div className="grid md:grid-cols-3 gap-3">
          <div className="h-20 bg-gray-100 rounded-2xl" />
          <div className="h-20 bg-gray-100 rounded-2xl" />
          <div className="h-20 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, data, color }: { title: string; data: { label: string; value: number }[]; color: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
      <h4 className="font-black text-gray-800 mb-6 text-lg">{title}</h4>
      <div className="space-y-4">
        {data.length === 0 && <p className="text-sm text-gray-400 italic">Sem dados suficientes.</p>}
        {data.map((d) => (
          <div key={d.label} className="group">
            <div className="flex justify-between text-sm mb-1.5"><span className="text-gray-600 font-medium group-hover:text-gray-900 transition-colors">{d.label}</span><span className="font-bold text-gray-900">{d.value}</span></div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full ${color} rounded-full transition-all duration-1000 ease-out`} style={{ width: `${(d.value / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Card({ title, value, icon }: { title: string; value: string; icon: ReactNode }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-orange-200 border border-gray-100 flex flex-col gap-4 transition-all duration-300 group">
      <div className="w-12 h-12 bg-orange-50 text-brand-orange rounded-xl flex items-center justify-center group-hover:bg-brand-orange group-hover:text-white transition-colors duration-300">
        {icon}
      </div>
      <div>
        <p className="text-gray-500 text-sm font-semibold tracking-wide uppercase">{title}</p>
        <p className="text-3xl font-black text-gray-900 mt-1">{value}</p>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="group">
      <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider group-focus-within:text-brand-orange transition-colors">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:bg-white focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10 transition-all font-medium text-gray-800" />
    </div>
  );
}
