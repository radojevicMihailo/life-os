CREATE TABLE "notif_sent" (
	"task_id" text NOT NULL,
	"action_at" timestamp with time zone NOT NULL,
	"lead" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notif_sent_task_id_action_at_lead_pk" PRIMARY KEY("task_id","action_at","lead")
);
