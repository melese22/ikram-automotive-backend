const { z } = require('zod');

const phoneRegex = /^\+?[0-9]{10,15}$/;

const register = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().regex(phoneRegex, 'Invalid phone number'),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(6).max(128),
  role: z.enum(['Customer', 'Mechanic', 'WorkshopManager', 'SuperAdmin']).optional(),
  workshopId: z.string().uuid().optional().or(z.null()),
});

const login = z.object({
  phone: z.string().regex(phoneRegex).optional(),
  email: z.string().email().optional(),
  password: z.string().min(1),
}).refine(data => data.phone || data.email, { message: 'Phone or email is required.' });

const forgotPassword = z.object({
  email: z.string().email(),
});

const resetPassword = z.object({
  token: z.string().min(1),
  password: z.string().min(6).max(128),
});

const createVehicle = z.object({
  plateNumber: z.string().min(1).max(20).optional(),
  chassisNumber: z.string().max(50).optional(),
  make: z.string().min(1).max(100),
  model: z.string().min(1).max(100),
  year: z.number().int().min(1900).max(2100).optional(),
  vin: z.string().min(1).max(50).optional(),
  mileage: z.number().min(0).optional(),
  customerId: z.string().uuid(),
  vehicleType: z.enum(['ICE', 'Hybrid', 'BEV', 'PHEV']).optional(),
  batteryCapacity: z.number().min(0).optional(),
  batterySoc: z.number().min(0).max(100).optional(),
  batteryHealth: z.number().min(0).max(100).optional(),
  motorType: z.string().max(50).optional(),
  firmwareVersion: z.string().max(50).optional(),
});

const createJobCard = z.object({
  vehicleId: z.string().uuid(),
  description: z.string().max(2000).optional(),
});

const createAppointment = z.object({
  customerId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  title: z.string().min(1).max(200),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().max(2000).optional(),
});

const publicBook = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().regex(phoneRegex, 'Invalid phone number'),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(6).max(128),
  make: z.string().min(1).max(50),
  model: z.string().min(1).max(50),
  year: z.number().int().min(1900).max(2100).optional(),
  plateNumber: z.string().min(1).max(20).optional(),
  workshopId: z.string().uuid(),
  title: z.string().min(1).max(200),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().max(2000).optional(),
});

const generateInvoice = z.object({
  jobCardId: z.string().uuid(),
  laborCost: z.number().min(0).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  notes: z.string().max(2000).optional(),
  depositPaid: z.number().min(0).optional(),
});

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  createVehicle,
  createJobCard,
  createAppointment,
  publicBook,
  generateInvoice,
};
