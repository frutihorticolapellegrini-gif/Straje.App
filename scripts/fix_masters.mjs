import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'

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

const masters = [
  {
    email: 'prueba_tiendaropa2026@hotmail.com',
    password: 'Prueba_tiendaropa2026',
    nombre: 'Programador Principal',
    empresa: 'Straje.App Desarrollo',
    plan: 'programador',
    rol: 'dueño'
  },
  {
    email: 'cache_tienda2026@hotmail.com',
    password: 'Cache_tienda2026',
    nombre: 'Dueño Cache',
    empresa: 'Cache Tienda Premium',
    plan: 'premium',
    rol: 'dueño'
  }
]

async function fixMasters() {
  console.log("🛠️ Reparando perfiles maestros borrados...")

  for (const master of masters) {
    console.log(`Intentando iniciar sesión con ${master.email}...`)
    
    // 1. Iniciar sesión para obtener el ID real y estar autenticados (para RLS)
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: master.email,
      password: master.password
    })

    if (authError) {
      console.log(`⚠️ No se pudo iniciar sesión para ${master.email}: ${authError.message}`)
      continue
    }

    const userId = authData.user.id
    console.log(`✅ Sesión iniciada. ID: ${userId}`)

    // 2. Verificar si ya tiene empresa asignada (por si acaso)
    const { data: existingUser } = await supabase.from('usuarios').select('*').eq('id', userId).single()
    if (existingUser) {
      console.log(`👍 El perfil de ${master.email} ya está correcto.`)
      continue
    }

    console.log(`Recreando empresa y perfil para ${master.email}...`)
    const empresaId = crypto.randomUUID()

    // 3. Crear Empresa
    const { error: empError } = await supabase.from('empresas').insert({
      id: empresaId,
      nombre: master.empresa,
      email_contacto: master.email,
      plan: master.plan
    })

    if (empError) {
      console.error(`❌ Error al recrear empresa: ${empError.message}`)
      continue
    }

    // 4. Crear Perfil (Dueño)
    const { data: userInsertData, error: userError } = await supabase.from('usuarios').insert({
      id: userId,
      empresa_id: empresaId,
      rol: master.rol,
      nombre: master.nombre,
      activo: true
    }).select()

    console.log("Insert Data Devuelto:", userInsertData)

    if (userError) {
      console.error(`❌ Error al recrear perfil: ${userError.message}`)
      continue
    }

    console.log(`🎉 Cuenta ${master.email} reparada exitosamente.`)
  }

  console.log("Finalizado. Cerrando sesiones...")
  await supabase.auth.signOut()
}

fixMasters()
