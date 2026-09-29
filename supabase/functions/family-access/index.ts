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

    // Este aplicativo tem uma única família. Qualquer aparelho que acessar
    // o link e entrar anonimamente é associado automaticamente à Família Medeiros.
    const { data: existingMember, error: memberLookupError } = await admin
      .from("family_members")
      .select("family_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (memberLookupError) throw memberLookupError;

    if (existingMember?.family_id) {
      const { data: family, error } = await admin
        .from("families")
        .select("id,name,pairing_code")
        .eq("id", existingMember.family_id)
        .single();
      if (error) throw error;
      return response({ family });
    }

    let { data: family, error: familyLookupError } = await admin
      .from("families")
      .select("id,name,pairing_code")
      .eq("name", "Família Medeiros")
      .maybeSingle();
    if (familyLookupError) throw familyLookupError;

    if (!family) {
      const pairingCode = crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
      const { data: created, error: createError } = await admin
        .from("families")
        .insert({ name: "Família Medeiros", pairing_code: pairingCode })
        .select("id,name,pairing_code")
        .single();
      if (createError && createError.code !== "23505") throw createError;
      family = created;
      if (!family) {
        const { data: existingFamily, error: retryError } = await admin
          .from("families")
          .select("id,name,pairing_code")
          .eq("name", "Família Medeiros")
          .single();
        if (retryError) throw retryError;
        family = existingFamily;
      }
    }

    const { error: memberError } = await admin
      .from("family_members")
      .insert({ family_id: family.id, user_id: user.id });
    if (memberError && memberError.code !== "23505") throw memberError;

    return response({ family });
  } catch (error) {
    console.error(error);
    return response({ error: error instanceof Error ? error.message : "Erro interno." }, 500);
  }
});