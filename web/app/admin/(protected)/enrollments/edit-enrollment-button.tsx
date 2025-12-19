"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EditEnrollmentDialog } from "./edit-enrollment-dialog";
import type { AdminEnrollmentListItem } from "@/server/services/admin/enrollments";

export const EditEnrollmentButton = ({
  item,
}: {
  item: AdminEnrollmentListItem;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        編輯
      </Button>
      <EditEnrollmentDialog item={item} open={open} onOpenChange={setOpen} />
    </>
  );
};
