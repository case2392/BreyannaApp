import { prisma } from "@/lib/db";
import {
  CreateClassTypeForm,
  CreateInstructorForm,
} from "@/components/admin/CreateForms";

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
              <div key={c.id} className="card flex items-center gap-3 p-4">
                <span
                  className="h-8 w-1.5 rounded-full"
                  style={{ backgroundColor: c.color }}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{c.name}</div>
                  <div className="text-xs text-ink-500">
                    {c.duration} min · cap {c.capacity} · {c.creditCost} credit
                    {c.creditCost === 1 ? "" : "s"}
                  </div>
                </div>
                <div className="shrink-0 text-xs text-ink-400">
                  {c._count.sessions} sessions
                </div>
              </div>
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
