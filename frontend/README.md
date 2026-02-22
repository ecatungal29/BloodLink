# BloodLink Frontend

A modern blood donation platform frontend built with Next.js 14 and Tailwind CSS.

## Features

- 🩸 **User Authentication**
  - User registration and login
  - JWT token management
  - Role-based access control

- 🏥 **Blood Donation Management**
  - Create and track blood donation requests
  - View donation history
  - Real-time status updates

- 📊 **Dashboard**
  - Personalized user dashboard
  - Blood request overview
  - Donation history tracking
  - Quick action buttons

- 🎨 **Modern UI/UX**
  - Responsive design with Tailwind CSS
  - Clean, intuitive interface
  - Loading states and error handling

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **Authentication**: JWT tokens

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Homepage
│   ├── layout.tsx            # Root layout
│   ├── globals.css             # Global styles
│   ├── auth/
│   │   ├── login/page.tsx     # Login page
│   │   └── register/page.tsx  # Registration page
│   └── dashboard/page.tsx     # User dashboard
├── components/              # Reusable components
├── lib/                    # Utility functions
└── types/                   # TypeScript type definitions
```

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd BloodLink/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Environment setup**
   ```bash
   # Create .env.local file
   cp .env.example .env.local
   
   # Add your backend URL
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

4. **Start development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open in browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

## API Integration

The frontend communicates with the Django backend through REST API endpoints:

### Authentication Endpoints
- `POST /api/auth/register/` - User registration
- `POST /api/auth/login/` - User login
- `POST /api/auth/logout/` - User logout
- `GET /api/auth/profile/me/` - Get user profile

### Blood Donation Endpoints
- `GET /api/donations/requests/` - List blood requests
- `POST /api/donations/requests/` - Create blood request
- `GET /api/donations/donations/` - List donations
- `POST /api/donations/donations/schedule/` - Schedule donation

### Inventory Endpoints
- `GET /api/donations/inventory/` - Get blood inventory
- `GET /api/donations/centers/` - List donation centers

## Authentication Flow

1. **Login/Register**: Users authenticate via email/password
2. **Token Storage**: JWT tokens stored in localStorage
3. **API Calls**: Authorization header with Bearer token
4. **Auto-logout**: Token expiration handling

## Component Architecture

### Page Components
- **Layout**: Root layout with navigation
- **Auth Pages**: Login and registration forms
- **Dashboard**: Main user dashboard
- **Homepage**: Landing page with features

### Reusable Components
- **Forms**: Input validation and submission
- **Cards**: Display requests and donations
- **Navigation**: Header and sidebar components
- **Loading**: Spinners and skeleton states

## Styling

### Tailwind CSS Configuration
- Custom color palette for blood donation theme
- Responsive breakpoints
- Component variants and utilities

### Design System
- **Primary Colors**: Red/white theme for medical context
- **Typography**: Clean, readable fonts
- **Spacing**: Consistent margin/padding system
- **Components**: Reusable UI patterns

## Development

### Code Style
- TypeScript for type safety
- ESLint configuration
- Prettier for code formatting
- Component-based architecture

### State Management
- React hooks (useState, useEffect)
- Local storage for persistence
- Context API for global state

### Error Handling
- Form validation with user feedback
- API error handling with retry logic
- Network error detection

## Deployment

### Build Process
```bash
npm run build
```

### Environment Variables
```bash
NEXT_PUBLIC_API_URL=https://your-backend-url.com
NEXT_PUBLIC_APP_NAME=BloodLink
```

### Production Deployment
- Vercel (recommended for Next.js)
- Netlify
- AWS Amplify
- Docker containers

## Contributing

1. **Fork the repository**
2. **Create feature branch**
3. **Make changes with tests**
4. **Submit pull request**
5. **Follow code style guidelines**

## Troubleshooting

### Common Issues
- **CORS errors**: Check backend CORS settings
- **Authentication failures**: Verify token storage
- **API connection**: Check backend URL configuration
- **Build errors**: Clear node_modules and reinstall

### Debug Mode
```bash
# Enable debug logging
DEBUG=bloodlink:* npm run dev
```

## Performance

### Optimization
- Image optimization with Next.js Image component
- Code splitting with dynamic imports
- Lazy loading for heavy components
- Service worker for caching

### Monitoring
- Error tracking integration
- Performance metrics
- User analytics

## Security

### Best Practices
- Input sanitization
- XSS prevention
- CSRF protection
- Secure token storage
- HTTPS enforcement in production

## Support

For questions or support:
- Check the main project README
- Review API documentation
- Open an issue in the repository

---

**Built with ❤️ for the blood donation community**
# BloodLink
