# Recipe App v2

A modern recipe management application built with Next.js, tRPC, and Prisma.

## Features

- Recipe management with CRUD operations
- Step-by-step cooking mode with timers
- Ingredient scaling and unit conversion
- Cooking history tracking
- Type-safe API with tRPC
- PostgreSQL database with Prisma ORM
- Responsive design for mobile and desktop

## Prerequisites

- Node.js >= 18.17.0 (Required by Next.js 14)
- PostgreSQL database
- Git

## Node.js Installation

### macOS
Using Homebrew:
```bash
brew install node@18
brew link node@18
```

### Windows
1. Download Node.js 18 LTS from [nodejs.org](https://nodejs.org/)
2. Run the installer
3. Follow the installation wizard

### Linux
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

## Database Setup

1. Install PostgreSQL:
   - **macOS**: `brew install postgresql`
   - **Windows**: Download from [postgresql.org](https://www.postgresql.org/download/windows/)
   - **Linux**: `sudo apt-get install postgresql`

2. Start PostgreSQL:
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

## Application Setup

1. Clone the repository:
```bash
git clone [repository-url]
cd recipeapp-v2
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. Initialize the database:
```bash
npx prisma generate
npx prisma db push
```

5. Start the development server:
```bash
npm run dev
```

## Project Structure

- `/src/pages`: Next.js pages and API routes
- `/src/server`: tRPC server code and API endpoints
- `/src/components`: React components
  - `/ui`: Reusable UI components
  - `/recipe`: Recipe-specific components
- `/prisma`: Database schema and migrations
- `/public`: Static assets

## Available Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm start`: Start production server
- `npm run lint`: Run linter

## Features in Detail

### Cooking Mode
- Step-by-step instructions
- Smart timer management
- Ingredient scaling
- Progress tracking
- Cooking history recording

### Recipe Management
- Create, edit, and delete recipes
- Ingredient management
- Instruction steps
- Cooking time tracking
- Difficulty levels

### History Tracking
- Record cooking sessions
- Track actual cooking time
- Save number of servings cooked
- View cooking history per recipe

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -am 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.