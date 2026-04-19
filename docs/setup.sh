#!/bin/bash
set -e

echo "Setting up Maestring development environment..."

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "Node.js is required. Install from https://nodejs.org"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "npm is required"; exit 1; }
command -v npx >/dev/null 2>&1 || { echo "npx is required"; exit 1; }

echo "1. Installing dependencies..."
npm install

echo "2. Setting up environment..."
if [ ! -f .env.local ]; then
    cp .env.example .env.local
    echo "   Created .env.local from .env.example"
    echo "   Fill in your API keys before continuing."
    echo "   Required: SUPABASE_*, ANTHROPIC_API_KEY, OPENAI_API_KEY"
else
    echo "   .env.local already exists, skipping"
fi

echo "3. Starting Supabase..."
npx supabase start

echo "4. Running migrations..."
npx supabase db push

echo "5. Generating types..."
npx supabase gen types typescript --local > types/supabase-generated.ts

echo "6. Seeding knowledge graph..."
npm run seed

echo ""
echo "Setup complete! Run: npm run dev"
