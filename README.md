# E-Commerce Platform

A modern, full-stack e-commerce platform built with React, TypeScript, and Supabase. Features a complete admin dashboard, payment processing with PayFast, and a responsive user interface.

> **System Status (Feb 19, 2026):** Full stabilisation audit completed — 23 issues resolved across edge functions, database security, and code consistency. All 7 edge functions modernised to `Deno.serve()`. Order confirmation emails now working. 7 DB functions pinned with `SET search_path`. 8 RLS policies hardened. 3 items remain as manual Supabase dashboard actions (OTP expiry, leaked password protection, Postgres upgrade). See `CHANGELOG.md` for full details.

## 🚀 Live Demo

**Production URL**: [View Live Application](https://lovable.dev/projects/9c0a23d3-ead5-4224-9937-e979356b1411)

## 📋 Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Environment Setup](#environment-setup)
- [Database Schema](#database-schema)
- [Payment Integration](#payment-integration)
- [Admin Features](#admin-features)
- [API Documentation](#api-documentation)
- [Security](#security)
- [Development](#development)
- [Deployment](#deployment)
- [Contributing](#contributing)

## ✨ Features

### Customer Features
- **Product Catalog**: Browse products with advanced search and filtering
- **Shopping Cart**: Add/remove items with real-time updates
- **Wishlist**: Save favorite products for later
- **User Authentication**: Secure sign up/sign in with email
- **Order Management**: Track order status and history
- **Product Reviews**: Rate and review purchased products
- **Responsive Design**: Mobile-first, fully responsive interface

### Admin Features
- **Dashboard**: Analytics and metrics overview
- **Product Management**: CRUD operations with bulk actions
- **Order Management**: Process orders, update status, track fulfillment
- **User Management**: Role-based access control
- **Payment Configuration**: PayFast integration settings
- **Inventory Management**: Stock tracking and low stock alerts
- **Analytics**: Sales reports and customer insights
- **Content Management**: Homepage banners and promotional content

### Technical Features
- **Real-time Updates**: Live notifications and data sync
- **Image Optimization**: Lazy loading and responsive images
- **SEO Optimized**: Meta tags, structured data, semantic HTML
- **Security**: Rate limiting, input validation, CSRF protection
- **Performance**: Code splitting, caching, optimized queries

## 🛠 Technology Stack

### Frontend
- **React 18** - UI library with hooks and context
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Modern component library
- **React Router** - Client-side routing
- **React Query** - Server state management
- **React Hook Form** - Form handling and validation
- **Zod** - Schema validation

### Backend
- **Supabase** - Backend-as-a-Service
- **PostgreSQL** - Relational database
- **Row Level Security (RLS)** - Database-level security
- **Edge Functions** - Serverless functions
- **Real-time Subscriptions** - Live data updates

### Payment Processing
- **PayFast** - South African payment gateway
- **Multiple Payment Methods**: Credit cards, EFT, mobile payments

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Git** - Version control
- **GitHub Actions** - CI/CD pipeline

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Git
- Supabase account
- PayFast merchant account (for payments)

### Installation

1. **Clone the repository**
   ```bash
   git clone <YOUR_GIT_URL>
   cd <YOUR_PROJECT_NAME>
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   ```
   http://localhost:5173
   ```

## ⚙️ Environment Setup

### Supabase Configuration

This project uses Supabase for backend services. The following secrets are required:

#### Required Secrets
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_DB_URL=your_database_url
RESEND_API_KEY=your_resend_api_key_for_emails
```

#### PayFast Configuration
```
PAYFAST_MERCHANT_ID=your_merchant_id
PAYFAST_MERCHANT_KEY=your_merchant_key
PAYFAST_PASSPHRASE=your_passphrase
PAYFAST_MODE=sandbox_or_production
```

### Setting Up Supabase

1. Create a new Supabase project
2. Run the database migrations (handled automatically)
3. Configure authentication providers
4. Set up storage buckets for images
5. Deploy edge functions

## 🗄️ Database Schema

### Core Tables

#### Users & Authentication
- `profiles` - User profile information
- `user_roles` - Role-based access control
- `email_preferences` - User email settings

#### Products & Catalog
- `categories` - Product categories
- `products` - Product catalog
- `product_images` - Product image gallery
- `reviews` - Customer reviews and ratings

#### Orders & Commerce
- `orders` - Order information
- `order_items` - Order line items
- `order_timeline` - Order status tracking
- `fulfillments` - Order fulfillment records
- `payment_transactions` - Payment records

#### Cart & Wishlist
- `cart_items` - Shopping cart contents
- `wishlists` - Customer wishlists

#### Analytics & Reporting
- `analytics_events` - User behavior tracking
- `analytics_metrics` - Aggregated metrics

### Key Features
- **Row Level Security (RLS)** on all tables
- **Audit trails** for sensitive operations
- **Soft deletes** for data retention
- **Optimized indexes** for performance
- **Triggers** for automated tasks

## 💳 Payment Integration

### PayFast Setup

1. **Create PayFast Account**
   - Sign up at [payfast.io](https://payfast.io)
   - Get merchant credentials

2. **Configure in Admin**
   - Navigate to `/admin/settings`
   - Go to PayFast Configuration tab
   - Enter merchant details
   - Set sandbox/production mode

3. **Supported Payment Methods**
   - Credit/Debit Cards
   - Instant EFT
   - Mobile Payments
   - Bank Transfers

### Payment Flow
1. Customer adds items to cart
2. Proceeds to checkout
3. PayFast payment page opens
4. Payment processed securely
5. Order confirmed and email sent
6. Stock levels updated

## 👨‍💼 Admin Features

### Access Levels
- **Customer**: Basic user access
- **Admin**: Product and order management
- **Superadmin**: Full system access

### Admin Dashboard
- Sales analytics and metrics
- Recent orders and activities
- Low stock alerts
- Quick actions panel

### Product Management
- Bulk product import/export
- Image management and optimization
- Category organization
- Stock tracking and alerts

### Order Management
- Order processing workflow
- Status updates and tracking
- Fulfillment management
- Customer communication

## 📚 API Documentation

### Edge Functions

#### Payment Processing
- `create-payment` - Initialize PayFast payment
- `verify-payment` - Verify payment completion
- `get-payfast-config` - Retrieve payment configuration

#### Email Services
- `send-email` - Send transactional emails
- `send-order-notification` - Order status updates

#### Product Management
- `import-products` - Bulk product import
- Background processing for large datasets

### Database Functions
- `search_products()` - Advanced product search
- `update_product_stock()` - Inventory management
- `bulk_update_order_status()` - Order processing

## 🔒 Security

### Security Measures
- **Row Level Security (RLS)** - Database access control
- **Rate Limiting** - API abuse prevention
- **Input Validation** - XSS and injection protection
- **CSRF Protection** - Cross-site request forgery prevention
- **Secure Headers** - Security-first HTTP headers
- **Audit Logging** - Security event tracking

### Authentication
- Email/password authentication
- Secure session management
- Role-based access control
- Password reset functionality

### Data Protection
- Encrypted data at rest
- Secure data transmission
- PII data handling
- GDPR compliance ready

## 🔧 Development

### Code Structure
```
src/
├── components/          # Reusable UI components
│   ├── admin/          # Admin-specific components
│   ├── auth/           # Authentication components
│   ├── common/         # Shared components
│   ├── products/       # Product-related components
│   └── ui/             # shadcn/ui components
├── hooks/              # Custom React hooks
├── pages/              # Route components
├── contexts/           # React contexts
├── lib/                # Utility functions
└── styles/             # Global styles

supabase/
├── functions/          # Edge functions
├── migrations/         # Database migrations
└── config.toml         # Supabase configuration
```

### Development Workflow
1. Create feature branch
2. Implement changes
3. Test locally
4. Create pull request
5. Code review
6. Deploy to staging
7. Production deployment

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

### Testing
- Unit tests with Vitest
- Integration tests
- E2E tests with Playwright
- Performance testing

## 🚀 Deployment

### Lovable Platform
1. Click "Publish" in Lovable editor
2. Configure custom domain (paid plans)
3. Set up SSL certificate
4. Configure environment variables

### Self-Hosting Options
1. **Vercel/Netlify**
   - Connect GitHub repository
   - Configure build settings
   - Set environment variables

2. **Docker**
   - Use provided Dockerfile
   - Configure container registry
   - Deploy to cloud platform

3. **Traditional Hosting**
   - Build static files
   - Upload to web server
   - Configure web server

### Environment Configuration
- Set all required environment variables
- Configure database connection
- Set up payment gateway
- Configure email service

## 🤝 Contributing

### Getting Started
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Code Standards
- Follow TypeScript best practices
- Use semantic commit messages
- Maintain test coverage
- Follow design system guidelines

### Pull Request Process
1. Update documentation
2. Add tests for new features
3. Ensure CI passes
4. Request code review
5. Address feedback

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- [Lovable Documentation](https://docs.lovable.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [PayFast Documentation](https://developers.payfast.co.za/)

### Community
- [Lovable Discord](https://discord.com/channels/1119885301872070706/1280461670979993613)
- [GitHub Issues](https://github.com/yourusername/yourrepo/issues)

### Professional Support
For enterprise support and custom development, please contact our team.

---

## 🔗 Quick Links

- [Live Application](https://lovable.dev/projects/9c0a23d3-ead5-4224-9937-e979356b1411)
- [Supabase Dashboard](https://supabase.com/dashboard/project/kauostzhxqoxggwqgtym)
- [PayFast Dashboard](https://payfast.io)

---

Built with ❤️ using [Lovable](https://lovable.dev)