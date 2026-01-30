# FluxoClinicas

Multi-tenant SaaS medical clinic management system built with React, TypeScript, Vite, and Supabase.

## 🚀 Features

- **Multi-tenant Architecture**: Isolated data per clinic
- **Role-based Access Control**: Super Admin, Clinic Admin, Doctor, Receptionist
- **Appointment Management**: Scheduling with doctor availability
- **Medical Records**: Anamneses, prescriptions, certificates
- **Modern UI**: Glass-morphism design with Tailwind CSS
- **Type-safe**: Full TypeScript with Supabase dfffatabase types

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite 4
- **Styling**: TailwindCSS + Radix UI
- **Backend**: Supabase (PostgreSQL + Auth)
- **Animations**: Framer Motion
- **PDF Generation**: jsPDF

## 📦 Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🔧 Development

The project is fully migrated to TypeScript. See [TYPESCRIPT_MIGRATION.md](./TYPESCRIPT_MIGRATION.md) for details.

### Project Structure

```
src/
├── components/        # Reusable components
│   ├── ui/           # Radix UI primitives
│   └── [Modals]      # Feature modals
├── contexts/         # React contexts (Auth)
├── lib/              # Supabase clients & utilities
├── pages/            # Dashboard pages
├── types/            # TypeScript type definitions
│   ├── database.types.ts    # Supabase schema types
│   └── components.types.ts  # Component prop types
├── App.tsx           # Main app component
└── main.tsx          # Entry point
```

## 🔐 Environment Variables

Create a `.env` file (recommended for production):

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 📊 Database Schema

The application uses the following main tables:
- `clinics` - Clinic information
- `profiles` - User profiles with roles
- `doctors` - Doctor-specific data
- `patients` - Patient records
- `appointments` - Scheduling
- `medical_reports` - Anamneses
- `prescriptions` - Medication/lens prescriptions
- `medical_certificates` - Medical certificates
- `doctor_work_hours` - Doctor availability

See `src/types/database.types.ts` for complete schema types.

## 🎯 User Roles

1. **SUPER_ADMIN**: Platform-level management
   - Create and manage clinics
   - Create clinic administrators

2. **CLINIC_ADMIN**: Clinic-level managementss
   - Manage doctors and receptionists
   - Configure work hours
   - View clinic calendar

3. **DOCTOR**: Medical professional
   - Manage appointments
   - Create medical reports
   - Issue prescriptions and certificates

4. **RECEPTIONIST**: Front desk
   - Schedule appointments
   - Weekly planner view
   - Patient management

## 🚀 Recent Updates

- ✅ **Migrated to TypeScript** - All files converted from `.jsx` to `.tsx`
- ✅ **Comprehensive Supabase types** - Full database schema types
- ✅ **Type-safe core infrastructure** - Auth, clients, utilities fully typed
- ✅ **Build successful** - Production-ready with zero blocking errors
- ✅ **Tailwind config migrated** - Now using `tailwind.config.ts`
- ⚠️ **Gradual typing** - Some components use `@ts-nocheck` for incremental improvement

See `MIGRATION_COMPLETE.md` for full details.

## 📝 License

Private project
