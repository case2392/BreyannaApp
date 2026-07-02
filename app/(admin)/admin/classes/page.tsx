import { prisma } from "@/lib/db";
import {
  CreateClassTypeForm,
  CreateInstructorForm,
  CreateRoomForm,
} from "@/components/admin/CreateForms";
import { ClassTypeRow } from "@/components/admin/ClassTypeRow";
import { InstructorRow } from "@/components/admin/InstructorRow";
import { RoomRow } from "@/components/admin/RoomRow";

export const dynamic = "force-dynamic";

export default async function ClassesPage() {
  const [classTypes, instructors, rooms] = await Promise.all([
    prisma.classType.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { sessions: true } } },
    }),
    prisma.instructor.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { sessions: true } } },
    }),
    prisma.room.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { sessions: true } } },
    }),
  ]);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Classes, instructors &amp; rooms</h1>
      <p className="mb-6 text-sm text-ink-500">
        Define the classes you offer, who teaches them, and where. Add, edit, or
        remove any of them.
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

        <div className="space-y-8">
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

          <div>
            <h2 className="mb-3 font-semibold">Rooms</h2>
            <div className="mb-4 space-y-2">
              {rooms.map((r) => (
                <RoomRow
                  key={r.id}
                  room={{
                    id: r.id,
                    name: r.name,
                    capacity: r.capacity,
                    sessions: r._count.sessions,
                  }}
                />
              ))}
            </div>
            <CreateRoomForm />
          </div>
        </div>
      </div>
    </div>
  );
}
