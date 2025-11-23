-- CreateEnum
CREATE TYPE "AIModelType" AS ENUM ('EXPENSE_CATEGORIZATION', 'INVOICE_OCR', 'CASH_FLOW_FORECASTING', 'ANOMALY_DETECTION', 'RECOMMENDATION_ENGINE', 'CHATBOT');

-- CreateEnum
CREATE TYPE "AIModelStatus" AS ENUM ('TRAINING', 'READY', 'DEPLOYED', 'DEPRECATED', 'FAILED');

-- CreateEnum
CREATE TYPE "PredictionConfidence" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH');

-- CreateEnum
CREATE TYPE "AnomalyType" AS ENUM ('DUPLICATE_TRANSACTION', 'UNUSUAL_AMOUNT', 'SUSPICIOUS_VENDOR', 'SPENDING_SPIKE', 'FRAUD_PATTERN', 'MISSING_RECEIPT', 'LATE_PAYMENT', 'BUDGET_OVERRUN');

-- CreateEnum
CREATE TYPE "AnomalySeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL', 'URGENT');

-- CreateEnum
CREATE TYPE "RecommendationType" AS ENUM ('TAX_SAVING', 'COST_REDUCTION', 'PAYMENT_TERMS', 'AUTOMATION', 'WORKFLOW_IMPROVEMENT', 'VENDOR_NEGOTIATION', 'EARLY_PAYMENT_DISCOUNT', 'INVENTORY_OPTIMIZATION');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'IMPLEMENTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "ai_models" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "type" "AIModelType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "status" "AIModelStatus" NOT NULL DEFAULT 'TRAINING',
    "accuracy" DOUBLE PRECISION,
    "trainingData" INTEGER NOT NULL DEFAULT 0,
    "lastTrained" TIMESTAMP(3),
    "modelData" JSONB,
    "config" JSONB,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prediction_logs" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT,
    "inputData" JSONB NOT NULL,
    "prediction" JSONB NOT NULL,
    "confidence" "PredictionConfidence" NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "feedback" TEXT,
    "isCorrect" BOOLEAN,
    "processingTime" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prediction_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_data" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "modelType" "AIModelType" NOT NULL,
    "features" JSONB NOT NULL,
    "label" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "source" TEXT,
    "isValidated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anomaly_detections" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "AnomalyType" NOT NULL,
    "severity" "AnomalySeverity" NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "detectedValue" JSONB NOT NULL,
    "expectedValue" JSONB,
    "confidence" DOUBLE PRECISION NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "anomaly_detections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "RecommendationType" NOT NULL,
    "status" "RecommendationStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "potentialSaving" DECIMAL(15,2),
    "estimatedImpact" TEXT,
    "actionSteps" JSONB NOT NULL,
    "relatedResource" TEXT,
    "relatedId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "confidence" DOUBLE PRECISION NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "implementedBy" TEXT,
    "implementedAt" TIMESTAMP(3),
    "feedback" TEXT,
    "actualSaving" DECIMAL(15,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_conversations" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "context" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "functionCall" JSONB,
    "functionResult" JSONB,
    "tokens" INTEGER,
    "model" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_models_companyId_type_idx" ON "ai_models"("companyId", "type");

-- CreateIndex
CREATE INDEX "prediction_logs_modelId_createdAt_idx" ON "prediction_logs"("modelId", "createdAt");

-- CreateIndex
CREATE INDEX "prediction_logs_companyId_createdAt_idx" ON "prediction_logs"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "training_data_companyId_modelType_idx" ON "training_data"("companyId", "modelType");

-- CreateIndex
CREATE INDEX "training_data_isValidated_idx" ON "training_data"("isValidated");

-- CreateIndex
CREATE INDEX "anomaly_detections_companyId_isResolved_idx" ON "anomaly_detections"("companyId", "isResolved");

-- CreateIndex
CREATE INDEX "anomaly_detections_severity_isResolved_idx" ON "anomaly_detections"("severity", "isResolved");

-- CreateIndex
CREATE INDEX "anomaly_detections_createdAt_idx" ON "anomaly_detections"("createdAt");

-- CreateIndex
CREATE INDEX "recommendations_companyId_status_idx" ON "recommendations"("companyId", "status");

-- CreateIndex
CREATE INDEX "recommendations_type_status_idx" ON "recommendations"("type", "status");

-- CreateIndex
CREATE INDEX "recommendations_priority_idx" ON "recommendations"("priority");

-- CreateIndex
CREATE INDEX "chat_conversations_companyId_userId_idx" ON "chat_conversations"("companyId", "userId");

-- CreateIndex
CREATE INDEX "chat_conversations_lastMessageAt_idx" ON "chat_conversations"("lastMessageAt");

-- CreateIndex
CREATE INDEX "chat_messages_conversationId_createdAt_idx" ON "chat_messages"("conversationId", "createdAt");

-- AddForeignKey
ALTER TABLE "ai_models" ADD CONSTRAINT "ai_models_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prediction_logs" ADD CONSTRAINT "prediction_logs_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "ai_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prediction_logs" ADD CONSTRAINT "prediction_logs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_data" ADD CONSTRAINT "training_data_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomaly_detections" ADD CONSTRAINT "anomaly_detections_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
