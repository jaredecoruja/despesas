import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import App from "../App";

const SUPABASE_URL = "https://zqltesejplhvdiupkmhv.supabase.co";
const SUPABASE_KEY = "sb_publishable_oUP_J_xKkL9lF8U0G3cz_Q_Mt-zTGtx";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

type Expense = { id:string; date:string; description:string; category:string; value:number; payment:string; note:string; paid?:boolean; dueDate?:string };
type Category = { name:string; icon:string };

function LoginScreen() {
  const [mode, setMode] = useState<"login"|"signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || password.length < 6) {
      setMessage("Informe um e-mail e uma senha com pelo menos 6 caracteres.");
      return;
    }
    setBusy(true); setMessage("");
    const result = mode === "login"
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({ email: email.trim(), password });
    setBusy(false);
    if (result.error) setMessage(result.error.message);
    else if (mode === "signup" && !result.data.session) setMessage("Conta criada. Verifique seu e-mail para confirmar o acesso.");
  };

  return <div style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:20,background:"#f7f8fc"}}>
    <div className="card" style={{width:"100%",maxWidth:420,padding:28}}>
      <div style={{textAlign:"center",marginBottom:22}}><div style={{fontSize:34}}>💰</div><h1 style={{margin:"8px 0 4px"}}>DESPESAS</h1><p style={{margin:0,color:"#6b7280"}}>Seu controle financeiro sincronizado</p></div>
      <form onSubmit={submit} style={{display:"grid",gap:14}}>
        <label>E-mail<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com" autoComplete="email"/></label>
        <label>Senha<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo de 6 caracteres" autoComplete={mode==="login"?"current-password":"new-password"}/></label>
        {message&&<div style={{padding:12,borderRadius:10,background:"#faf5ff",color:"#6d28d9",fontSize:14}}>{message}</div>}
        <button className="save-btn" type="submit" disabled={busy}>{busy?"AGUARDE...":mode==="login"?"ENTRAR":"CRIAR CONTA"}</button>
      </form>
      <button type="button" onClick={()=>{setMode(mode==="login"?"signup":"login");setMessage("")}} style={{display:"block",margin:"16px auto 0",border:0,background:"transparent",color:"#7c3aed",fontWeight:700,cursor:"pointer"}}>{mode==="login"?"Ainda não tenho conta":"Já tenho uma conta"}</button>
    </div>
  </div>;
}

async function syncLocalData(userId:string, initial:boolean) {
  const expenseRaw = localStorage.getItem("despesas-expenses");
  const categoryRaw = localStorage.getItem("despesas-categories");
  const localExpenses: Expense[] = expenseRaw ? JSON.parse(expenseRaw) : [];
  const localCategories: Category[] = categoryRaw ? JSON.parse(categoryRaw) : [];

  const { data: remoteExpenses, error: expenseError } = await supabase.from("expenses").select("id,date,description,category,value,payment,note,paid,due_date").eq("user_id", userId);
  if (expenseError) throw expenseError;
  const { data: remoteCategories, error: categoryError } = await supabase.from("categories").select("name,icon").eq("user_id", userId);
  if (categoryError) throw categoryError;

  if (initial && remoteExpenses?.length) {
    const mapped = remoteExpenses.map((e:any)=>({...e,dueDate:e.due_date ?? undefined}));
    localStorage.setItem("despesas-expenses", JSON.stringify(mapped));
  } else if (initial && !remoteExpenses?.length && localExpenses.length) {
    await writeExpenses(userId, localExpenses);
  }

  if (initial && remoteCategories?.length) {
    localStorage.setItem("despesas-categories", JSON.stringify(remoteCategories));
  } else if (initial && !remoteCategories?.length && localCategories.length) {
    await writeCategories(userId, localCategories);
  }
}

async function writeExpenses(userId:string, expenses:Expense[]) {
  const rows = expenses.map(e=>({id:e.id,user_id:userId,date:e.date,description:e.description,category:e.category,value:e.value,payment:e.payment,note:e.note||"",due_date:e.dueDate||null,paid:e.paid===true}));
  if (rows.length) {
    const { error } = await supabase.from("expenses").upsert(rows,{onConflict:"id"});
    if (error) throw error;
  }
  const { data: existing, error: readError } = await supabase.from("expenses").select("id").eq("user_id",userId);
  if (readError) throw readError;
  const keep = new Set(expenses.map(e=>e.id));
  const remove = (existing||[]).map((e:any)=>e.id).filter((id:string)=>!keep.has(id));
  if (remove.length) {
    const { error } = await supabase.from("expenses").delete().eq("user_id",userId).in("id",remove);
    if (error) throw error;
  }
}

async function writeCategories(userId:string, categories:Category[]) {
  const clean = categories.filter(c=>c.name!=="Cartão de crédito");
  if (clean.length) {
    const { error } = await supabase.from("categories").upsert(clean.map(c=>({user_id:userId,name:c.name,icon:c.icon})),{onConflict:"user_id,name"});
    if (error) throw error;
  }
  const { data: existing, error: readError } = await supabase.from("categories").select("id,name").eq("user_id",userId);
  if (readError) throw readError;
  const keep = new Set(clean.map(c=>c.name));
  const remove = (existing||[]).filter((c:any)=>!keep.has(c.name)).map((c:any)=>c.id);
  if (remove.length) {
    const { error } = await supabase.from("categories").delete().eq("user_id",userId).in("id",remove);
    if (error) throw error;
  }
}

function AppSync({ session }:{session:Session}) {
  const ready = useRef(false);
  const nativeSetItem = useRef<typeof localStorage.setItem | null>(null);
  const [error,setError] = useState("");

  useEffect(()=>{
    let active = true;
    const start = async()=>{
      try {
        await syncLocalData(session.user.id,true);
        if (!active) return;
        nativeSetItem.current = window.localStorage.setItem.bind(window.localStorage);
        const original = nativeSetItem.current;
        window.localStorage.setItem = function(key:string,value:string){
          original(key,value);
          if (!ready.current) return;
          if (key === "despesas-expenses") {
            localStorage.setItem("despesas-sync-origin",String(Date.now()));
            void writeExpenses(session.user.id,JSON.parse(value));
          }
          if (key === "despesas-categories") {
            localStorage.setItem("despesas-sync-origin",String(Date.now()));
            void writeCategories(session.user.id,JSON.parse(value));
          }
        };
        ready.current = true;
      } catch (e:any) { if (active) setError(e?.message||"Não foi possível sincronizar os dados."); }
    };
    void start();
    return ()=>{active=false;if(nativeSetItem.current) window.localStorage.setItem=nativeSetItem.current;};
  },[session.user.id]);

  useEffect(()=>{
    const channel = supabase.channel("despesas-live-sync")
      .on("postgres_changes",{event:"*",schema:"public",table:"expenses",filter:`user_id=eq.${session.user.id}`},()=>{
        const origin=Number(localStorage.getItem("despesas-sync-origin")||0);
        if (Date.now()-origin<2500) return;
        window.location.reload();
      })
      .on("postgres_changes",{event:"*",schema:"public",table:"categories",filter:`user_id=eq.${session.user.id}`},()=>{
        const origin=Number(localStorage.getItem("despesas-sync-origin")||0);
        if (Date.now()-origin<2500) return;
        window.location.reload();
      })
      .subscribe();
    return ()=>{void supabase.removeChannel(channel);};
  },[session.user.id]);

  if (error) return <div style={{padding:30}}><h2>Erro de sincronização</h2><p>{error}</p><button onClick={()=>window.location.reload()}>Tentar novamente</button></div>;
  return <App/>;
}

function Root() {
  const [session,setSession] = useState<Session|null>(null);
  const [loading,setLoading] = useState(true);
  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false);});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>setSession(next));
    return ()=>subscription.unsubscribe();
  },[]);
  if (loading) return <div style={{minHeight:"100vh",display:"grid",placeItems:"center"}}>Carregando...</div>;
  return session?<AppSync session={session}/>:<LoginScreen/>;
}

export const Route = createFileRoute("/")({ component: Root });
