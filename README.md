# SaaS Opportunity Intelligence Tool

A powerful tool for analyzing Reddit discussions to identify SaaS opportunities using AI analysis.

## 🚀 Epic 1 Features

- **User Authentication** - Secure registration and login with email verification
- **Dashboard** - Real-time statistics and analysis overview
- **Reddit Analysis Configuration** - Select subreddits, time ranges, and keywords
- **Cost Estimation** - Transparent pricing with budget controls
- **Analysis Execution** - AI-powered opportunity detection (simulated in Epic 1)
- **Results Display** - Comprehensive SaaS opportunity reports
- **Analysis History** - Track and manage all your analyses

## 🛠 Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (Neon)
- **Authentication**: Custom JWT with email verification
- **Styling**: Mercury.com-inspired dark theme
- **Deployment**: Vercel

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL database (we recommend [Neon](https://neon.tech))
- Reddit API credentials
- OpenAI API key
- Gmail account for email sending

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd first-project
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual credentials:

- **DATABASE_URL**: Your Neon PostgreSQL connection string
- **NEXTAUTH_SECRET**: Generate with `openssl rand -base64 32`
- **Email settings**: Gmail SMTP configuration
- **Reddit API**: Client ID and secret from Reddit app
- **OpenAI API**: Your OpenAI API key

### 4. Set up the database
```bash
npx prisma generate
npx prisma db push
```

### 5. Run the development server
```bash
npm run dev
```

Open [http://localhost:3002](http://localhost:3002) in your browser.

## 🌐 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add all environment variables in Vercel dashboard
4. Deploy!

**Important**: Update `NEXTAUTH_URL` to your Vercel domain after deployment.

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/verify-email` - Email verification
- `GET /api/auth/refresh` - Token refresh

### Analysis
- `POST /api/analysis/configuration` - Save analysis config
- `GET /api/analysis/stats` - Dashboard statistics
- `GET /api/analysis/list` - User's analysis history
- `POST /api/analysis/[id]/approve-cost` - Approve analysis cost

### Reddit Integration
- `POST /api/reddit/validate-subreddit` - Validate subreddit exists
- `POST /api/reddit/estimate-posts` - Estimate post count

## 🔧 Development

### Run tests
```bash
npm test
```

### Build for production
```bash
npm run build
```

### Database operations
```bash
# Push schema changes
npx prisma db push

# Open Prisma Studio
npx prisma studio

# Generate Prisma client
npx prisma generate
```

## 📖 Project Structure

```
├── app/                    # Next.js app directory
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Dashboard and analysis pages
│   └── api/               # API routes
├── components/            # Reusable React components
├── lib/                   # Utilities and services
│   ├── auth/             # Authentication logic
│   ├── validation/       # Zod schemas
│   └── utils/            # Helper functions
├── prisma/               # Database schema
└── docs/                 # Documentation
```

## 🎨 UI Design

The application features a Mercury.com-inspired dark theme with:
- Zinc color palette
- Backdrop blur effects
- Smooth transitions
- Modern glassmorphism design

## 🔒 Security Features

- JWT-based authentication
- Email verification required
- Password hashing with bcrypt
- Rate limiting on sensitive endpoints
- CSRF protection
- Secure cookie handling

## 📝 Environment Variables

See `.env.example` for all required environment variables.

## 🚦 Current Status

**Epic 1**: ✅ Complete - Core MVP with simulated analysis
**Epic 2**: 🔄 Planned - Advanced AI analysis
**Epic 3**: 🔄 Planned - Scale and discovery features
**Epic 4**: 🔄 Planned - UX optimization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## 📄 License

This project is for educational and demonstration purposes.

---

Built with ❤️ using Next.js and Claude Code