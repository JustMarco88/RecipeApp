# Recipe App v2

A modern recipe management application built with Next.js, tRPC, and Prisma. Features AI-powered recipe suggestions and image generation.

## Features

- Recipe management with CRUD operations
- Step-by-step cooking mode with timers
- Ingredient scaling and unit conversion
- Cooking history tracking
- Smart session management with auto-resume
- AI-powered features:
  - Recipe suggestions and improvements
  - Image generation using StabilityAI
  - Multiple AI service integrations (OpenAI, Claude, xAI)
- Recipe tags and smart search
- Type-safe API with tRPC
- PostgreSQL database with Prisma ORM
- Responsive design for mobile and desktop

## Prerequisites

- Node.js >= 18.17.0 (Required by Next.js 14)
- PostgreSQL database
- Git
- API keys for AI services:
  - StabilityAI API key
  - OpenAI API key (optional)
  - Anthropic API key (optional)
  - xAI API key (optional)

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
# Edit .env with your database credentials and API keys
```

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `STABILITY_API_KEY`: StabilityAI API key for image generation
- `OPENAI_API_KEY`: (Optional) OpenAI API key for recipe suggestions
- `ANTHROPIC_API_KEY`: (Optional) Anthropic API key for Claude integration
- `XAI_API_KEY`: (Optional) xAI API key for additional AI features

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
  - `/api`: tRPC routers and procedures
- `/src/components`: React components
  - `/ui`: Reusable UI components
  - `/recipe`: Recipe-specific components
- `/src/utils`: Utility functions and services
  - `/ai.ts`: AI service interface
  - `/stability.ts`: StabilityAI integration
  - `/openai.ts`: OpenAI integration
  - `/claude.ts`: Anthropic Claude integration
  - `/xai.ts`: xAI integration
  - `/prompts.ts`: Centralized prompt management
- `/prisma`: Database schema and migrations
- `/public`: Static assets

## Available Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm start`: Start production server
- `npm run lint`: Run linter

## Features in Detail

### AI Integration
- Recipe suggestions based on title or ingredients
- Recipe improvements and tips
- AI-generated recipe images using StabilityAI
- Multiple AI service providers with fallback options
- Centralized prompt management for consistent AI interactions

### Cooking Mode
- Step-by-step instructions
- Smart timer management
- Ingredient scaling
- Progress tracking
- Cooking history recording
- Auto-resume previous sessions
- Step feedback and improvements

### Recipe Management
- Create, edit, and delete recipes
- Ingredient management
- Instruction steps
- Cooking time tracking
- Difficulty levels
- Recipe tags
- Smart search across all recipe fields

### History Tracking
- Record cooking sessions
- Track actual cooking time
- Save number of servings cooked
- View cooking history per recipe
- Session feedback and improvements
- Smart session management with auto-resume

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -am 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.