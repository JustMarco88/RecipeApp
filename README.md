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

## Database Setup

### PostgreSQL Installation

1. Install PostgreSQL:
   - **macOS**: `brew install postgresql`
   - **Windows**: Download installer from [PostgreSQL website](https://www.postgresql.org/download/windows/)
   - **Linux**: `sudo apt-get install postgresql`

2. Start PostgreSQL service:
   - **macOS**: `brew services start postgresql`
   - **Windows**: Service starts automatically
   - **Linux**: `sudo systemctl start postgresql`

3. Create database and user:
```sql
psql postgres
CREATE DATABASE recipeapp;
CREATE USER recipeapp WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE recipeapp TO recipeapp;
```

### Environment Configuration

1. Create a `.env` file in the project root:
```env
DATABASE_URL="postgresql://recipeapp:your_password@localhost:5432/recipeapp"
```

2. Make sure the following environment variables are set:
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_URL`: Your application URL (e.g., http://localhost:3000)
- `NEXTAUTH_SECRET`: Random string for session encryption

### Troubleshooting

If you encounter database connection issues:
1. Verify PostgreSQL is running: `pg_isready`
2. Check database exists: `psql -l`
3. Ensure user permissions are correct
4. Verify `.env` configuration matches your database settings 