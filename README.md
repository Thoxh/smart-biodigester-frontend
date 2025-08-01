# Smart Biodigester Monitor - Frontend

> Real-time monitoring system for smart biodigester sensor data with advanced visualization and alarm management.

## 📋 Overview

The Smart Biodigester Monitor Frontend is a modern Next.js application for monitoring and visualizing sensor data from an intelligent biogas fermenter. The application provides real-time data visualization, alarm systems, and responsive charts for various sensor parameters.

### 🎯 Key Features

- **Real-time Dashboard**: Live display of all sensor data with automatic updates
- **Advanced Charts**: Interactive time-series diagrams with adaptive scaling
- **Alarm Management**: Visual warning systems for critical parameter ranges
- **Mobile-First Design**: Fully responsive user interface
- **Performance-Optimized**: Data sampling and intelligent caching strategies

### 📊 Monitored Parameters

- **Tank Temperatures**: Two independent temperature sensors (optimal: 30-40°C)
- **pH Value**: Acidity level of fermenter contents (optimal: 6-8)
- **Environmental Sensors**: Temperature, humidity, air pressure, gas resistance
- **Methane Measurement**: Concentration in ppm and percent, sensor temperature
- **System Status**: Error diagnosis and sensor condition monitoring

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm or bun
- Supabase project with configured database

### Installation

1. **Clone repository**
   ```bash
   git clone <repository-url>
   cd sensor-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Required variables in `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

5. **Open application**
   
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🏗️ Project Structure

```
sensor-frontend/
├── app/                    # Next.js App Router
│   ├── charts/            # Charts page for data visualization
│   │   └── page.tsx       # Advanced chart components
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout component
│   └── page.tsx           # Main dashboard
├── components/            # Reusable UI components
│   └── ui/               # Base UI components (shadcn/ui)
├── lib/                   # Utility functions and configuration
│   ├── supabase.ts       # Supabase client configuration
│   └── utils.ts          # General helper functions
├── public/               # Static assets
└── package.json          # Project dependencies
```

## 🎨 Technology Stack

### Frontend Framework
- **Next.js 15.3.3**: React framework with App Router
- **React 19**: Modern React features and hooks
- **TypeScript 5**: Type safety and better developer experience

### Styling & UI
- **Tailwind CSS 4**: Utility-first CSS framework
- **shadcn/ui**: High-quality, accessible UI components
- **Radix UI**: Primitive UI components for accessibility
- **Lucide React**: Modern icon library

### Data Visualization
- **Recharts 2.15.3**: Powerful chart library
- **Adaptive Scaling**: Automatic Y-axis adjustment
- **Alarm Zones**: Visual areas for optimal values

### Backend & Database
- **Supabase**: PostgreSQL database with real-time subscriptions
- **Real-time Updates**: WebSocket-based live data
- **Polling Fallback**: Robust data updates

## 📱 Features in Detail

### Dashboard (Main Page)
- **Live Sensor Data**: Current values of all parameters
- **Alarm Status**: Individual monitoring for each sensor
- **Critical Warnings**: Immediate notifications for problems
- **System Status**: Overview of all sensor states
- **Responsive Design**: Optimized for all screen sizes

### Charts Page
- **Time Range Selection**: 1h, 12h, 1d, 1w, 1m
- **Multi-Parameter Charts**: Separate diagrams for each sensor type
- **Adaptive Y-Axis**: Intelligent scaling based on time range
- **Alarm Zones**: Color-coded background areas
- **Mobile Optimization**: Touch-friendly operation
- **Performance Sampling**: Data reduction for large time ranges

### Alarm System
- **Tank Temperature**: Optimal 30-40°C, warning outside range
- **pH Value**: Optimal 6-8, critical at extreme values
- **Individual Sensors**: Separate monitoring for Temp1 and Temp2
- **Visual Indicators**: Color coding (Green/Red/Gray)
- **Status Dashboard**: Central overview of all alarms

## 🔧 Development

### Available Scripts

```bash
# Development server with Turbopack
npm run dev

# Create production build
npm run build

# Start production server
npm run start

# Code linting
npm run lint
```

### Code Quality
- **ESLint**: Automatic code analysis
- **TypeScript**: Strict typing
- **Production-Ready**: Comprehensive JSDoc documentation
- **Best Practices**: Modern React patterns

### Responsive Design
- **Mobile-First**: Optimized for small screens
- **Breakpoints**: sm (640px+), lg (1024px+)
- **Touch-Friendly**: Large buttons and intuitive navigation
- **Performance**: Optimized loading times on mobile devices

## 🚀 Deployment

### Vercel (Recommended)
1. Connect repository with Vercel
2. Configure environment variables in Vercel dashboard
3. Automatic deployment on Git push

## 📊 Database Schema

### sensor_data Table
```sql
CREATE TABLE sensor_data (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  ph DECIMAL,
  ph_voltage DECIMAL,
  temp1 DECIMAL,
  temp2 DECIMAL,
  bme_temperature DECIMAL,
  bme_humidity DECIMAL,
  bme_pressure DECIMAL,
  bme_gas_resistance DECIMAL,
  methan_raw TEXT[],
  methane_ppm DECIMAL,
  methane_percent DECIMAL,
  methane_temperature DECIMAL,
  methane_faults TEXT[]
);
```

## 🤝 Contributors

- **Tim Siebert** - Lead Developer
- **Max Zboralski** - Co-Developer

## 📄 License

This project is private and intended for internal use.

## 🆘 Support

For questions or issues:
1. Create issues in the repository
2. Check documentation in component files
3. Contact the development team

---

**Version**: 1.0.0  
**Last Updated**: August 31, 2025  
**Next.js Version**: 15.3.3
