# Recipe App v2

A modern recipe management application built with Next.js, tRPC, and Prisma.

## Features

- Recipe management with CRUD operations
- Structured recipe data with ingredients, instructions, and metadata
- Type-safe API with tRPC
- PostgreSQL database with Prisma ORM
- Responsive design for mobile and desktop

## Prerequisites

- Node.js 16+ and npm
- PostgreSQL database
- Git

## Setup

1. Clone the repository:
\`\`\`bash
git clone [repository-url]
cd recipeapp-v2
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Set up the database:
- Create a PostgreSQL database
- Copy .env.example to .env and update the DATABASE_URL

4. Initialize the database:
\`\`\`bash
npx prisma db push
\`\`\`

5. Start the development server:
\`\`\`bash
npm run dev
\`\`\`

## Development

- \`npm run dev\`: Start development server
- \`npm run build\`: Build for production
- \`npm start\`: Start production server
- \`npm run lint\`: Run linter

## Project Structure

- \`/src/pages\`: Next.js pages
- \`/src/server\`: tRPC server code
- \`/src/utils\`: Utility functions
- \`/prisma\`: Database schema and migrations 