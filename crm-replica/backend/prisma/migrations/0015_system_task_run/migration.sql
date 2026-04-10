CREATE TABLE "SystemTaskRun" (
  "id" TEXT NOT NULL,
  "task" TEXT NOT NULL,
  "last_run_at" TIMESTAMP(3) NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SystemTaskRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SystemTaskRun_task_key" ON "SystemTaskRun"("task");
