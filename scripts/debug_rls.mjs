import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.resolve(__dirname, '../.env.example') // using .env.example since they wrote keys there

const envFile = fs.readFileSync(envPath, 'utf8')
let SUPABASE_URL = ''
let SUPABASE_ANON_KEY = ''

envFile.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) SUPABASE_URL = line.split('=')[1].trim()
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) SUPABASE_ANON_KEY = line.split('=')[1].trim()
})

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function testSupabase() {
  console.log("Testing Supabase RLS...")
  
  // Login as the owner we created in register
  // We need an email and password that exists. 
  // Let's just try to login with a known user or skip login and just print error?
  // Since we don't know the exact credentials the user registered with, 
  // let's just make a bogus insert to see the error.
  
  const { error: selectError } = await supabase.from('usuarios').select('*')
  console.log("Select Error:", selectError)
  
}

testSupabase()
