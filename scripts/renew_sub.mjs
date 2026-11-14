import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.resolve(__dirname, '../.env') // try .env first, maybe fallback to .env.example
let envFile = '';
try {
  envFile = fs.readFileSync(envPath, 'utf8')
} catch(e) {
  envFile = fs.readFileSync(path.resolve(__dirname, '../.env.example'), 'utf8')
}

let SUPABASE_URL = ''
let SUPABASE_ANON_KEY = ''

envFile.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) SUPABASE_URL = line.split('=')[1].trim()
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) SUPABASE_ANON_KEY = line.split('=')[1].trim()
})

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function run() {
  const email = 'cache_tienda2026@hotmail.com'
  const pass = 'Cache_tienda2026'
  
  console.log("Logging in as", email)
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password: pass })
  
  if (authError) {
    console.error("Login error:", authError.message)
    return
  }

  const userId = authData.user.id
  console.log("Logged in, User ID:", userId)

  const { data: profile, error: profileErr } = await supabase.from('usuarios').select('*').eq('id', userId).single()
  
  if (profileErr) {
    console.error("Profile error:", profileErr.message)
    return
  }

  const empresaId = profile.empresa_id
  console.log("Empresa ID:", empresaId)

  // set fecha_fin_prueba to 30 days from now
  const newDate = new Date()
  newDate.setDate(newDate.getDate() + 30)
  
  const { data: empUpdate, error: empUpdateErr } = await supabase.from('empresas')
    .update({ 
      fecha_fin_prueba: newDate.toISOString(),
      activa: true 
    })
    .eq('id', empresaId)
    .select()

  if (empUpdateErr) {
    console.error("Update error:", empUpdateErr.message)
  } else {
    console.log("Subscription updated successfully:", empUpdate)
  }
}

run()
