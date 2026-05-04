import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.resolve(__dirname, '../.env.example')

const envFile = fs.readFileSync(envPath, 'utf8')
let SUPABASE_URL = ''
let SUPABASE_ANON_KEY = ''

envFile.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) SUPABASE_URL = line.split('=')[1].trim()
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) SUPABASE_ANON_KEY = line.split('=')[1].trim()
})

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function checkStatus() {
  const email = 'prueba_tiendaropa2026@hotmail.com'
  const pass = 'Prueba_tiendaropa2026'
  
  console.log("Ingresando...")
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password: pass })
  
  if (authError) {
    console.log("Error de login:", authError.message)
    return
  }

  const userId = authData.user.id
  console.log("User ID:", userId)

  const { data: profile, error: profileErr } = await supabase.from('usuarios').select('*').eq('id', userId)
  
  if (profileErr) {
    console.log("❌ Profile Error:", profileErr.message)
  } else {
    console.log("✅ Profile found:", profile)
    
    const { data: emp, error: empErr } = await supabase.from('empresas').select('*').eq('id', profile.empresa_id).single()
    if (empErr) {
      console.log("❌ Empresa Error:", empErr.message)
    } else {
      console.log("✅ Empresa found:", emp.nombre)
    }
  }
}

checkStatus()
