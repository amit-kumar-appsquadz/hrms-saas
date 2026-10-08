"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAsync } from "@/hooks/useAsync";
import { getPermissionCatalog, getRole } from "@/services/modules";
import { PageHeader, Card, CardBody, CardHeader, Button, TextField, Skeleton } from "@/components/ui";
import { useToast } from "@/components/providers/ToastProvider";
import type { PermissionDef } from "@/types/domain";

export default function RoleEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const roleId = Number(id);
  const isNew = roleId === 0;
  const router = useRouter();
  const { toast } = useToast();

  const { data: catalog, loading: loadingCatalog } = useAsync(() => getPermissionCatalog());
  const { data: role, loading: loadingRole } = useAsync(() => (isNew ? Promise.resolve(undefined) : getRole(roleId)), [roleId]);

  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (role) {
      setName(role.name);
      setSelected(new Set(role.permissions));
    }
  }, [role]);

  const grouped = useMemo(() => {
    const map: Record<string, PermissionDef[]> = {};
    (catalog ?? []).forEach((p) => {
      (map[p.module] ??= []).push(p);
    });
    return map;
  }, [catalog]);

  function toggle(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else {
        next.add(slug);
        // Dependency hint: edit implies view (RBAC_MODULE §2).
        const viewSlug = slug.replace(/\.\w+$/, ".view");
        if (slug.endsWith(".edit") && catalog?.some((c) => c.slug === viewSlug)) next.add(viewSlug);
      }
      return next;
    });
  }

  function toggleModule(module: string, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      grouped[module]?.forEach((p) => (on ? next.add(p.slug) : next.delete(p.slug)));
      return next;
    });
  }

  if (loadingCatalog || loadingRole) return <Skeleton className="h-96 w-full" />;

  return (
    <div>
      <PageHeader
        title={isNew ? "Create role" : `Edit role: ${role?.name ?? ""}`}
        breadcrumbs={[{ label: "Administration" }, { label: "Roles", href: "/admin/roles" }, { label: isNew ? "New" : "Edit" }]}
        actions={
          <div className="flex gap-2">
            <Button variant="tertiary" onClick={() => router.push("/admin/roles")}>Cancel</Button>
            <Button
              variant="primary"
              icon="check"
              onClick={() => {
                toast(`Role "${name || "Untitled"}" saved with ${selected.size} permissions (demo).`);
                router.push("/admin/roles");
              }}
            >
              Save role
            </Button>
          </div>
        }
      />

      <div className="mb-4">
        <Card>
          <CardBody>
            <div className="max-w-sm">
              <TextField label="Role name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Permission matrix" subtitle={`${selected.size} permissions selected`} />
        <CardBody className="p-0">
          <table className="w-full border-collapse text-body-sm">
            <caption className="sr-only">Permission matrix by module</caption>
            <tbody>
              {Object.entries(grouped).map(([module, perms]) => {
                const allOn = perms.every((p) => selected.has(p.slug));
                return (
                  <tr key={module} className="border-b border-border last:border-0">
                    <th scope="row" className="w-48 px-4 py-3 text-left align-top">
                      <div className="font-medium text-text">{module}</div>
                      <button
                        type="button"
                        onClick={() => toggleModule(module, !allOn)}
                        className="mt-1 text-caption text-primary hover:underline"
                      >
                        {allOn ? "Clear all" : "Select all"}
                      </button>
                    </th>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-x-5 gap-y-2">
                        {perms.map((p) => (
                          <label key={p.slug} className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selected.has(p.slug)}
                              onChange={() => toggle(p.slug)}
                              className="h-4 w-4 rounded-sm border-border-strong text-primary"
                            />
                            <span className="text-text">{p.action}</span>
                          </label>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
