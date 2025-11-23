# TypeScript Type Reference

Quick reference guide for using types in FluxoClinicas.

## Database Types

### Import Types
```typescript
import type { 
  Appointment, 
  Clinic, 
  Doctor, 
  Patient, 
  Profile,
  ProfileWithClinic,
  UserRole,
  AppointmentStatus
} from '@/types/database.types';
```

### Using Table Types
```typescript
// Get row type
type AppointmentRow = Tables<'appointments'>;

// Get insert type (for creating new records)
type NewAppointment = Inserts<'appointments'>;

// Get update type (for updating records)
type AppointmentUpdate = Updates<'appointments'>;
```

### Enums
```typescript
// User roles
type UserRole = 'SUPER_ADMIN' | 'CLINIC_ADMIN' | 'DOCTOR' | 'RECEPTIONIST';

// Appointment statuses
type AppointmentStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
```

## Supabase Client Usage

### Typed Queries
```typescript
import { supabase } from '@/lib/customSupabaseClient';

// TypeScript knows the return type
const { data: clinics } = await supabase
  .from('clinics')
  .select('*');
// clinics is Clinic[] | null

// With relations
const { data: profile } = await supabase
  .from('profiles')
  .select('*, clinic:clinics(*)')
  .eq('id', userId)
  .single();
// profile has clinic property typed
```

### Typed Inserts
```typescript
// TypeScript validates the insert object
await supabase.from('appointments').insert({
  clinic_id: 'uuid',
  doctor_id: 'uuid',
  patient_id: 'uuid',
  scheduled_start: '2024-01-01T10:00:00Z',
  scheduled_end: '2024-01-01T11:00:00Z',
  status: 'SCHEDULED' // Only valid statuses allowed
});
```

### Typed Updates
```typescript
await supabase
  .from('profiles')
  .update({ 
    name: 'New Name',
    updated_at: new Date().toISOString()
  })
  .eq('id', userId);
```

## Auth Context

### Using Auth Hook
```typescript
import { useAuth } from '@/contexts/SupabaseAuthContext';

function MyComponent() {
  const { user, profile, signIn, signOut, loading } = useAuth();
  
  // user: User | null
  // profile: ProfileWithClinic | null
  // signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  // signOut: () => Promise<{ error: AuthError | null }>
  // loading: boolean
}
```

### Creating Users
```typescript
const { user, error } = await createProfile(
  'email@example.com',
  'password123',
  {
    name: 'John Doe',
    role: 'DOCTOR',
    clinic_id: 'clinic-uuid'
  }
);
```

## Component Props

### Modal Components
```typescript
import type { CreateUserModalProps } from '@/types/components.types';

const CreateUserModal: React.FC<CreateUserModalProps> = ({
  clinicId,
  userToEdit,
  doctorData,
  onClose,
  onSuccess
}) => {
  // Component implementation
};
```

### Calendar Components
```typescript
import type { CalendarProps } from '@/types/components.types';

const ClinicCalendar: React.FC<CalendarProps> = ({
  clinicId,
  doctorId
}) => {
  // Component implementation
};
```

## Common Patterns

### Optional Chaining with Types
```typescript
// Safe access to nested properties
const clinicName = profile?.clinic?.name ?? 'No clinic';
```

### Type Guards
```typescript
function isDoctor(profile: Profile): profile is Profile & { role: 'DOCTOR' } {
  return profile.role === 'DOCTOR';
}

if (isDoctor(profile)) {
  // TypeScript knows profile.role is 'DOCTOR'
}
```

### Conditional Rendering
```typescript
{profile?.role === 'SUPER_ADMIN' && (
  <SuperAdminDashboard />
)}
```

### Array Operations
```typescript
const doctors = users.filter((u): u is Profile & { role: 'DOCTOR' } => 
  u.role === 'DOCTOR'
);
```

## Form Handling

### Typed Form State
```typescript
interface FormData {
  name: string;
  email: string;
  role: UserRole;
}

const [formData, setFormData] = useState<FormData>({
  name: '',
  email: '',
  role: 'DOCTOR'
});
```

### Event Handlers
```typescript
const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  // Handle form submission
};

const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
  setFormData(prev => ({
    ...prev,
    [e.target.name]: e.target.value
  }));
};
```

## Async Operations

### Typed Async Functions
```typescript
const fetchPatients = async (clinicId: string): Promise<Patient[]> => {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('clinic_id', clinicId);
  
  if (error) throw error;
  return data ?? [];
};
```

### Error Handling
```typescript
try {
  const patients = await fetchPatients(clinicId);
  setPatients(patients);
} catch (error) {
  console.error('Error fetching patients:', error);
  toast({
    variant: 'destructive',
    title: 'Error',
    description: 'Failed to load patients'
  });
}
```

## UI Components

### Button Props
```typescript
import { Button, type ButtonProps } from '@/components/ui/button';

<Button 
  variant="destructive" 
  size="sm"
  onClick={handleDelete}
>
  Delete
</Button>
```

### Toast
```typescript
import { toast } from '@/components/ui/use-toast';

toast({
  title: 'Success',
  description: 'Operation completed',
  variant: 'default' // or 'destructive'
});
```

## Best Practices

1. **Always import types with `type` keyword**
   ```typescript
   import type { Profile } from '@/types/database.types';
   ```

2. **Use strict null checks**
   ```typescript
   if (profile) {
     // Safe to access profile properties
   }
   ```

3. **Prefer interfaces for objects**
   ```typescript
   interface ComponentProps {
     id: string;
     name: string;
   }
   ```

4. **Use enums from database types**
   ```typescript
   const role: UserRole = 'DOCTOR'; // Type-safe
   ```

5. **Leverage type inference**
   ```typescript
   // TypeScript infers the type
   const [count, setCount] = useState(0); // number
   ```

## Troubleshooting

### Common Type Errors

**Error**: Property 'clinic' does not exist on type 'Profile'
```typescript
// Solution: Use ProfileWithClinic
const profile: ProfileWithClinic = ...
```

**Error**: Type 'string' is not assignable to type 'UserRole'
```typescript
// Solution: Use type assertion or validation
const role = formData.role as UserRole;
```

**Error**: Object is possibly 'null'
```typescript
// Solution: Use optional chaining or null check
const name = profile?.name ?? 'Unknown';
```

## Additional Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Supabase TypeScript Support](https://supabase.com/docs/reference/javascript/typescript-support)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
