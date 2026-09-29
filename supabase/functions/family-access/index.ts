import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js/cors";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return response({ error: "Sessão não encontrada." }, 401);
    const token = authorization.slice("Bearer ".length);
    const { data: { user }, error: userError } = await admin.auth.getUser(token);
    if (userError || !user) return response({ error: "Sessão inválida." }, 401);
    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    const { data: existingMember } = await admin.from("family_members").select("family_id").eq("user_id", user.id).maybeSingle();

    if (action === "create") {
      if (existingMember?.family_id) {
        const { data: family } = await admin.from("families").select("id,name,pairing_code").eq("id", existingMember.family_id).single();
        return response({ family });
      }
      const pairingCode = crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
      const { data: family, error: familyError } = await admin.from("families").insert({ name: "Família Medeiros", pairing_code: pairingCode }).select("id,name,pairing_code").single();
      if (familyError) return response({ error: familyError.code === "23505" ? "A família já foi criada. Use o código do outro aparelho para conectar este dispositivo." : familyError.message }, familyError.code === "23505" ? 409 : 500);
      const { error: memberError } = await admin.from("family_members").insert({ family_id: family.id, user_id: user.id });
      if (memberError) throw memberError;
      return response({ family });
    }

    if (action === "join") {
      const code = String(body?.pairingCode || "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
      if (code.length !== 8) return response({ error: "Código inválido. Informe o código de 8 caracteres." }, 400);
      if (existingMember?.family_id) {
        const { data: family } = await admin.from("families").select("id,name,pairing_code").eq("id", existingMember.family_id).single();
        return response({ family });
      }
      const { data: family, error: familyError } = await admin.from("families").select("id,name,pairing_code").eq("pairing_code", code).maybeSingle();
      if (familyError) throw familyError;
      if (!family) return response({ error: "Código não encontrado. Confira o código no aparelho principal." }, 404);
      const { error: memberError } = await admin.from("family_members").insert({ family_id: family.id, user_id: user.id });
      if (memberError && memberError.code !== "23505") throw memberError;
      return response({ family });
    }

    return response({ error: "Ação inválida." }, 400);
  } catch (error) {
    console.error(error);
    return response({ error: error instanceof Error ? error.message : "Erro interno." }, 500);
  }
});