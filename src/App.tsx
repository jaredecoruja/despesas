import { Bell, CalendarDays, Check, ChevronDown, CircleDollarSign, CreditCard, FileBarChart, Filter, Home, Menu, Pencil, Plus, Search, Settings, Trash2, WalletCards, X } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

type Expense={id:string;date:string;description:string;category:string;value:number;payment:string;note:string;paid?:boolean;dueDate?:string};
type Category={name:string;icon:string;active?:boolean};
const initialExpenses:Expense[]=[
{id:"001",date:"2026-09-28",description:"Supermercado",category:"Alimentação",value:350,payment:"Cartão de crédito",note:"Compra do mês",paid:false},
{id:"002",date:"2026-09-28",description:"Conta de luz",category:"Luz",value:120,payment:"Pix",note:"",paid:true},
{id:"003",date:"2026-09-27",description:"Combustível",category:"Outros",value:180,payment:"Cartão de crédito",note:"",paid:false},
{id:"004",date:"2026-09-26",description:"Netflix",category:"Assinaturas",value:39.9,payment:"Cartão de crédito",note:"",paid:false},
];
const defaultCategories:Category[]=["Alimentação|🛒","Água|💧","Luz|💡","Gás|🔥","Internet|🌐","Vestuário|👕","Assinaturas|📺","Supérfluos|✨","Saúde|💊","Lazer|🎮","Compras|🛍️","Outros|📦"].map(x=>{const [name,icon]=x.split("|");return{name,icon,active:true}});
const payments=["Dinheiro","Pix","Cartão de crédito","Boleto"];
const money=(v:number)=>v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const monthKey=(d:string)=>d.slice(0,7);
const monthLabel=(key:string)=>new Date(`${key}-01T12:00:00`).toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
const monthUpper=(key:string)=>monthLabel(key).replace(/ de /g," DE ").toUpperCase();
const isCard=(e:Expense)=>e.payment==="Cartão de crédito";
const isPending=(e:Expense)=>e.paid!==true;
const normalizeExpense=(e:Expense):Expense=>({...e,paid:e.paid===undefined?(e.payment==="Dinheiro"||e.payment==="Pix"):e.paid});
const dateBR=(d?:string)=>d?new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR"):"—";
const categoryIcon=(name:string)=>{const n=name.toLowerCase();if(/luz|energia|el[eé]tric/.test(n))return "💡";if(/a[áa]gua|hidra/.test(n))return "💧";if(/g[aá]s/.test(n))return "🔥";if(/internet|wifi|wi-fi|telefone|celular/.test(n))return "📱";if(/mercado|supermercado|feira/.test(n))return "🛒";if(/alimenta|comida|restaurante|lanche/.test(n))return "🍔";if(/combust[ií]vel|gasolina|etanol|abaste/.test(n))return "⛽";if(/transporte|uber|99|[ôo]nibus|metr[oô]/.test(n))return "🚗";if(/aluguel|moradia|casa/.test(n))return "🏠";if(/sa[uú]de|farm[aá]cia|m[eé]dico|hospital/.test(n))return "💊";if(/pet|animal|cachorro|gato/.test(n))return "🐶";if(/educa|escola|curso|faculdade/.test(n))return "🎓";if(/roupa|vestu[aá]rio/.test(n))return "👕";if(/sal[aá]rio|renda|receita/.test(n))return "💰";if(/imposto|taxa|tributo/.test(n))return "🧾";if(/assinatura|netflix|spotify|stream/.test(n))return "📺";if(/lazer|jogo|game|cinema/.test(n))return "🎮";if(/compra|shopping/.test(n))return "🛍️";return "📦"};

export default function App(){
 const [page,setPage]=useState("home");
 const [familyEntered,setFamilyEntered]=useState(()=>localStorage.getItem("despesas-family-entered")==="true");
 const [authReady,setAuthReady]=useState(false);
 const [syncError,setSyncError]=useState("");
 const [familyId,setFamilyId]=useState(()=>localStorage.getItem("despesas-family-id")||"");
 const [pairingCode,setPairingCode]=useState(()=>localStorage.getItem("despesas-family-pairing-code")||"");
 const [expenses,setExpenses]=useState<Expense[]>(()=>{try{const saved=JSON.parse(localStorage.getItem("despesas-expenses")||"null");return saved?saved.map(normalizeExpense):initialExpenses}catch{return initialExpenses}});
 const [categories,setCategories]=useState<Category[]>(()=>{try{const saved=JSON.parse(localStorage.getItem("despesas-categories")||"null");return (saved||defaultCategories).filter((c:Category)=>c.name!=="Cartão de crédito"&&c.active!==false).map((c:Category)=>({...c,icon:c.icon&&c.icon!=="🏷️"?c.icon:categoryIcon(c.name)}))}catch{return defaultCategories}});
 const [editing,setEditing]=useState<Expense|null>(null);const [showForm,setShowForm]=useState(false);const [toast,setToast]=useState("");

 useEffect(()=>{if(!familyEntered)return;let active=true;(async()=>{
  try{
   let {data:{session}}=await supabase.auth.getSession();
   if(!session){const r=await supabase.auth.signInAnonymously();if(r.error)throw r.error;session=r.data.session;}
   if(!session)throw new Error("Não foi possível criar a sessão.");
   const storedFamilyId=localStorage.getItem("despesas-family-id")||"";
   const storedJoinCode=localStorage.getItem("despesas-family-join-code")||"";
   let resolvedFamilyId=storedFamilyId;
   let resolvedPairingCode=localStorage.getItem("despesas-family-pairing-code")||"";
   if(!resolvedFamilyId){
     const userId=session.user.id;
     const {data:member,error:memberError}=await supabase.from("family_members").select("family_id").eq("user_id",userId).maybeSingle();
     if(memberError)throw new Error(memberError.message);
     let family:{id:string;pairing_code?:string}|null=null;
     if(member?.family_id){const r=await supabase.from("families").select("id,name,pairing_code").eq("id",member.family_id).maybeSingle();if(r.error)throw new Error(r.error.message);family=r.data;}
     else{let q=supabase.from("families").select("id,name,pairing_code");q=storedJoinCode?q.eq("pairing_code",storedJoinCode):q.eq("name","Família Medeiros");const r=await q.limit(1).maybeSingle();if(r.error)throw new Error(r.error.message);family=r.data;if(family){const j=await supabase.from("family_members").insert({family_id:family.id,user_id:userId});if(j.error&&j.error.code!=="23505")throw new Error(j.error.message);}}
     if(!family?.id)throw new Error("Não foi possível identificar a Família Medeiros.");
     resolvedFamilyId=family.id;resolvedPairingCode=family.pairing_code||resolvedPairingCode;localStorage.setItem("despesas-family-id",resolvedFamilyId);localStorage.setItem("despesas-family-pairing-code",resolvedPairingCode);localStorage.removeItem("despesas-family-join-code");
   }
   if(active){setFamilyId(resolvedFamilyId);setPairingCode(resolvedPairingCode);}
   const {data:remoteExpenses,error:expensesError}=await supabase.from("expenses").select("*").eq("family_id",resolvedFamilyId).order("date",{ascending:false});if(expensesError)throw expensesError;
   if(remoteExpenses?.length){const mapped=remoteExpenses.map((e:any)=>normalizeExpense({id:e.id,date:e.date,description:e.description,category:e.category,value:Number(e.value),payment:e.payment,note:e.note||"",paid:e.paid,dueDate:e.due_date||undefined}));if(active){setExpenses(mapped);localStorage.setItem("despesas-expenses",JSON.stringify(mapped));}}
   else{const local=JSON.parse(localStorage.getItem("despesas-expenses")||"null") as Expense[]|null;if(local?.length){const rows=local.map(e=>({id:e.id,user_id:session.user.id,family_id:resolvedFamilyId,date:e.date,description:e.description,category:e.category,value:e.value,payment:e.payment,note:e.note||"",paid:e.paid??false,due_date:e.dueDate||null}));const {error}=await supabase.from("expenses").upsert(rows);if(error)throw error;}}
   const {data:remoteCategories,error:categoriesError}=await supabase.from("categories").select("*").eq("family_id",resolvedFamilyId).order("created_at",{ascending:true});if(categoriesError)throw categoriesError;
   if(remoteCategories?.length){const mapped=remoteCategories.filter((c:any)=>c.active!==false&&c.name!=="Cartão de crédito").map((c:any)=>({name:c.name,icon:c.icon&&c.icon!=="🏷️"?c.icon:categoryIcon(c.name),active:true}));if(active){setCategories(mapped);localStorage.setItem("despesas-categories",JSON.stringify(mapped));}}
   else{const local=JSON.parse(localStorage.getItem("despesas-categories")||"null") as Category[]|null;const cats=(local||defaultCategories).filter(c=>c.name!=="Cartão de crédito"&&c.active!==false).map(c=>({...c,icon:c.icon&&c.icon!=="🏷️"?c.icon:categoryIcon(c.name)}));const rows=cats.map(c=>({user_id:session.user.id,family_id:resolvedFamilyId,name:c.name,icon:c.icon,active:true}));const {error}=await supabase.from("categories").upsert(rows,{onConflict:"family_id,name"});if(error)throw error;}
   if(active)setAuthReady(true);
  }catch(err:any){console.error(err);if(active){const hasFamily=Boolean(localStorage.getItem("despesas-family-id"));if(!hasFamily){localStorage.removeItem("despesas-family-entered");localStorage.removeItem("despesas-family-join-code");setFamilyEntered(false);setSyncError(err?.message||"Não foi possível conectar à família.");setAuthReady(false);}else{setSyncError(err?.message||"Não foi possível conectar ao Supabase.");setAuthReady(true);}}}
 })();return()=>{active=false}},[familyEntered]);

 useEffect(()=>{if(!familyId||!authReady)return;let reconnectTimer:number|undefined;let retryTimer:number|undefined;let disposed=false;
  const refreshSharedData=async()=>{try{const {data:re}=await supabase.from("expenses").select("*").eq("family_id",familyId).order("date",{ascending:false});if(re){const mapped=re.map((e:any)=>normalizeExpense({id:e.id,date:e.date,description:e.description,category:e.category,value:Number(e.value),payment:e.payment,note:e.note||"",paid:e.paid,dueDate:e.due_date||undefined}));setExpenses(mapped);localStorage.setItem("despesas-expenses",JSON.stringify(mapped));}const {data:rc}=await supabase.from("categories").select("name,icon,active").eq("family_id",familyId).eq("active",true).order("created_at",{ascending:true});if(rc){const mapped=rc.filter((c:any)=>c.name!=="Cartão de crédito").map((c:any)=>({name:c.name,icon:c.icon&&c.icon!=="🏷️"?c.icon:categoryIcon(c.name),active:true}));setCategories(mapped);localStorage.setItem("despesas-categories",JSON.stringify(mapped));}}catch(err){console.error("Falha ao atualizar após reconexão",err)}};
  const channel=supabase.channel(`family:${familyId}:sync`).on("postgres_changes",{event:"*",schema:"public",table:"expenses",filter:`family_id=eq.${familyId}`},(payload:any)=>{if(payload.eventType==="DELETE"){setExpenses(prev=>{const next=prev.filter(e=>e.id!==payload.old?.id);localStorage.setItem("despesas-expenses",JSON.stringify(next));return next;});return;}const row=payload.new;if(!row?.id)return;const incoming=normalizeExpense({id:row.id,date:row.date,description:row.description,category:row.category,value:Number(row.value),payment:row.payment,note:row.note||"",paid:row.paid,dueDate:row.due_date||undefined});setExpenses(prev=>{const exists=prev.some(e=>e.id===incoming.id);const next=exists?prev.map(e=>e.id===incoming.id?incoming:e):[incoming,...prev];localStorage.setItem("despesas-expenses",JSON.stringify(next));return next;});})
   .on("postgres_changes",{event:"*",schema:"public",table:"categories",filter:`family_id=eq.${familyId}`},(payload:any)=>{if(payload.eventType==="DELETE"){void refreshSharedData();return;}const row=payload.new;if(!row?.name)return;if(row.active===false){setCategories(prev=>{const next=prev.filter(c=>c.name!==row.name);localStorage.setItem("despesas-categories",JSON.stringify(next));return next;});return;}const incoming={name:row.name,icon:row.icon&&row.icon!=="🏷️"?row.icon:categoryIcon(row.name),active:true};setCategories(prev=>{const exists=prev.some(c=>c.name===incoming.name);const next=exists?prev.map(c=>c.name===incoming.name?incoming:c):[...prev,incoming];localStorage.setItem("despesas-categories",JSON.stringify(next));return next;});})
   .subscribe((status)=>{if(status==="SUBSCRIBED"){if(retryTimer)window.clearTimeout(retryTimer);setSyncError("");void refreshSharedData();}else if(status==="CHANNEL_ERROR"||status==="TIMED_OUT"){if(reconnectTimer)window.clearTimeout(reconnectTimer);reconnectTimer=window.setTimeout(()=>{if(disposed)return;void supabase.removeChannel(channel);retryTimer=window.setTimeout(()=>{if(!disposed)window.location.reload()},1000)},12000);}});
  return()=>{disposed=true;if(reconnectTimer)window.clearTimeout(reconnectTimer);if(retryTimer)window.clearTimeout(retryTimer);void supabase.removeChannel(channel)};
 },[familyId,authReady]);

 const saveExpenses=(next:Expense[],syncEntries:Expense[]=next)=>{const clean=next.map(normalizeExpense);setExpenses(clean);localStorage.setItem("despesas-expenses",JSON.stringify(clean));void (async()=>{try{const {data:{user}}=await supabase.auth.getUser();if(!user||!familyId)return;const rows=syncEntries.map(e=>({id:e.id,user_id:user.id,family_id:familyId,date:e.date,description:e.description,category:e.category,value:e.value,payment:e.payment,note:e.note||"",paid:e.paid??false,due_date:e.dueDate||null}));if(!rows.length)return;const {error}=await supabase.from("expenses").upsert(rows);if(error)throw error;}catch(err){console.error(err);setSyncError("Não foi possível sincronizar os lançamentos.");}})()};
 const saveCategories=(next:Category[])=>{const clean=next.filter(c=>c.name!=="Cartão de crédito").map(c=>({...c,icon:c.icon&&c.icon!=="🏷️"?c.icon:categoryIcon(c.name),active:true}));setCategories(clean);localStorage.setItem("despesas-categories",JSON.stringify(clean));void (async()=>{try{const {data:{user}}=await supabase.auth.getUser();if(!user||!familyId)return;const {data:old,error:oldError}=await supabase.from("categories").select("id,name,icon,active").eq("family_id",familyId);if(oldError)throw oldError;const oldRows=(old||[]) as any[];const activeNames=new Set(clean.map(c=>c.name.toLowerCase()));const deactivate=oldRows.filter(c=>c.active!==false&&!activeNames.has(String(c.name).toLowerCase()));for(const c of deactivate){const {error}=await supabase.from("categories").update({active:false}).eq("id",c.id).eq("family_id",familyId);if(error)throw error;}const oldByName=new Map(oldRows.map(c=>[String(c.name).toLowerCase(),c]));const rows=clean.filter(c=>{const existing=oldByName.get(c.name.toLowerCase());return !existing||existing.active!==false;}).map(c=>({user_id:user.id,family_id:familyId,name:c.name,icon:c.icon,active:true}));if(rows.length){const {error}=await supabase.from("categories").upsert(rows,{onConflict:"family_id,name"});if(error)throw error;}}catch(err){console.error(err);setSyncError("Não foi possível sincronizar as categorias. Tente novamente.");}})()};
 const notify=(m:string)=>{setToast(m);window.setTimeout(()=>setToast(""),2200)};
 const openNew=()=>{setEditing(null);setShowForm(true)};const openEdit=(e:Expense)=>{setEditing(e);setShowForm(true)};
 const save=(entries:Expense|Expense[])=>{const list=(Array.isArray(entries)?entries:[entries]).map(normalizeExpense);const ids=new Set(list.map(e=>e.id));saveExpenses([...list,...expenses.filter(x=>!ids.has(x.id))],list);setShowForm(false);setEditing(null);notify(list.length>1?`${list.length} parcelas salvas!`:editing?"Despesa atualizada!":"Despesa salva!")};
 const remove=(id:string)=>{if(confirm("Excluir esta despesa?")){void (async()=>{try{if(familyId){const {error}=await supabase.from("expenses").delete().eq("id",id).eq("family_id",familyId);if(error)throw error;}saveExpenses(expenses.filter(e=>e.id!==id),[]);notify("Despesa excluída.");}catch(err){console.error(err);setSyncError("Não foi possível excluir a despesa.");}})()}};
 const setPaid=(id:string,paid:boolean)=>{saveExpenses(expenses.map(e=>e.id===id?{...e,paid}:e),expenses.filter(e=>e.id===id).map(e=>({...e,paid})));notify(paid?"Despesa marcada como paga.":"Despesa voltou para pendentes.")};
 const setManyPaid=(ids:string[],paid:boolean)=>{const set=new Set(ids);saveExpenses(expenses.map(e=>set.has(e.id)?{...e,paid}:e),expenses.filter(e=>set.has(e.id)).map(e=>({...e,paid})));notify(paid?"Pagamento confirmado!":"Pagamento desfeito.")};
 if(!familyEntered) return <WelcomeScreen error={syncError} onEnter={(joinCode)=>{setSyncError("");localStorage.setItem("despesas-family-entered","true");if(joinCode)localStorage.setItem("despesas-family-join-code",joinCode);setFamilyEntered(true);}}/>;
 if(!authReady) return <div className="min-h-screen flex items-center justify-center">Conectando...</div>;
 return <MainApp page={page} setPage={setPage} expenses={expenses} categories={categories} onNew={openNew} onEdit={openEdit} onRemove={remove} onPaid={setPaid} onManyPaid={setManyPaid} onSaveCategories={saveCategories} toast={toast} syncError={syncError} pairingCode={pairingCode} />;
}

function WelcomeScreen({error,onEnter}:{error:string;onEnter:(joinCode?:string)=>void}){return <div className="min-h-screen flex items-center justify-center p-6"><div className="w-full max-w-md text-center"><div className="text-5xl mb-4">💰</div><h1 className="text-3xl font-bold">DESPESAS</h1><p className="mt-2 text-lg">Família Medeiros</p><button className="mt-8 w-full rounded-xl px-6 py-4 font-semibold" onClick={()=>onEnter()}>ENTRAR</button>{error&&<p className="mt-4 text-sm text-red-600">{error}</p>}</div></div>}

function MainApp(props:any){return <div>{/* interface existente */}</div>}
