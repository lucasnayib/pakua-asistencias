-- Restricción de asistencia por ubicación, opcional por escuela.
ALTER TABLE "Admin" ADD COLUMN "latitude" REAL;
ALTER TABLE "Admin" ADD COLUMN "longitude" REAL;
ALTER TABLE "Admin" ADD COLUMN "attendanceRadiusMeters" INTEGER;
