import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.resolve(__dirname, '../.env')

if (!fs.existsSync(envPath)) {
  console.error("No se encontró el archivo .env")
  process.exit(1)
}

const envFile = fs.readFileSync(envPath, 'utf8')
let SUPABASE_URL = ''
let SUPABASE_ANON_KEY = ''

envFile.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) SUPABASE_URL = line.split('=')[1].trim()
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) SUPABASE_ANON_KEY = line.split('=')[1].trim()
})

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("No se encontraron las credenciales en el .env")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const cuentasMaestras = [
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

async function initMasters() {
  console.log("Iniciando creación de cuentas maestras...")

  for (const cuenta of cuentasMaestras) {
    console.log(`Procesando cuenta: ${cuenta.email}`)
    
    // 1. Crear usuario en Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: cuenta.email,
      password: cuenta.password,
    })

    if (authError) {
      console.error(`Error al registrar ${cuenta.email} en Auth:`, authError.message)
      continue
    }

    const userId = authData.user?.id
    if (!userId) {
      console.error(`No se obtuvo ID de usuario para ${cuenta.email}`)
      continue
    }

    // Generamos el ID manualmente para evitar el problema de RLS SELECT
    const empresaId = crypto.randomUUID()

    // 2. Crear empresa (sin .select() para evitar error de RLS de lectura)
    const { error: empresaError } = await supabase
      .from('empresas')
      .insert({
        id: empresaId,
        nombre: cuenta.empresa,
        email_contacto: cuenta.email,
        plan: cuenta.plan
      })

    if (empresaError) {
      console.error(`Error al crear empresa para ${cuenta.email}:`, empresaError.message)
      continue
    }

    // 3. Crear registro de usuario en tabla pública
    const { error: usuarioError } = await supabase
      .from('usuarios')
      .insert({
        id: userId,
        empresa_id: empresaId,
        rol: cuenta.rol,
        nombre: cuenta.nombre
      })

    if (usuarioError) {
      console.error(`Error al crear perfil público para ${cuenta.email}:`, usuarioError.message)
      continue
    }

    console.log(`✅ Cuenta ${cuenta.email} creada exitosamente con empresa ${cuenta.empresa}.`)
  }

  console.log("\nFinalizado.")
}

initMasters()
