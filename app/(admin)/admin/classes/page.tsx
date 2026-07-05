import { prisma } from "@/lib/db";
import {
  CreateClassTypeForm,
  CreateInstructorForm,
} from "@/components/admin/CreateForms";
import { ClassTypeRow } from "@/components/admin/ClassTypeRow";
import { InstructorRow } from "@/components/admin/InstructorRow";

export const dynamic = "force-dynamic";

export default async function ClassesPage() {
  const [classTypes, instructors] = await Promise.all([
    prisma.classType.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { sessions: true } } },
    }),
    prisma.instructor.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { sessions: true } } },
    }),
  ]);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Classes &amp; instructors</h1>
      <p className="mb-6 text-sm text-ink-500">
        Define the classes you offer and who teaches them. Add, edit, or remove
        any of them.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 font-semibold">Class types</h2>
          <div className="mb-4 space-y-2">
            {classTypes.map((c) => (
              <ClassTypeRow
                key={c.id}
                ct={{
                  id: c.id,
                  name: c.name,
                  description: c.description,
                  duration: c.duration,
                  capacity: c.capacity,
                  creditCost: c.creditCost,
                  free: c.free,
                  color: c.color,
                  active: c.active,
                  sessions: c._count.sessions,
                }}
              />
            ))}
          </div>
          <CreateClassTypeForm />
        </div>

        <div>
          <h2 className="mb-3 font-semibold">Instructors</h2>
          <div className="mb-4 space-y-2">
            {instructors.map((i) => (
              <InstructorRow
                key={i.id}
                instructor={{
                  id: i.id,
                  name: i.name,
                  bio: i.bio,
                  sessions: i._count.sessions,
                }}
              />
            ))}
          </div>
          <CreateInstructorForm />
        </div>
      </div>
    </div>
  );
}
