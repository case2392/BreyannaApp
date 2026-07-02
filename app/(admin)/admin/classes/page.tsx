import { prisma } from "@/lib/db";
import {
  CreateClassTypeForm,
  CreateInstructorForm,
} from "@/components/admin/CreateForms";
import { ClassTypeRow } from "@/components/admin/ClassTypeRow";

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
        Define the kinds of classes you offer and who teaches them.
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
              <div key={i.id} className="card p-4">
                <div className="font-medium">{i.name}</div>
                {i.bio && <div className="text-xs text-ink-500">{i.bio}</div>}
                <div className="mt-1 text-xs text-ink-400">
                  {i._count.sessions} sessions taught
                </div>
              </div>
            ))}
          </div>
          <CreateInstructorForm />
        </div>
      </div>
    </div>
  );
}
