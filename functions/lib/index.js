"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.dailyRetentionPurge = exports.onJobSubmitted = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const v2_1 = require("firebase-functions/v2");
const admin = __importStar(require("firebase-admin"));
const firebase_functions_1 = require("firebase-functions");
admin.initializeApp();
const db = admin.firestore();
(0, v2_1.setGlobalOptions)({ region: "asia-northeast3" });
exports.onJobSubmitted = (0, firestore_1.onDocumentUpdated)("jobs/{jobId}", async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    if (!beforeData || !afterData)
        return;
    if (beforeData.status !== "SUBMITTED" && afterData.status === "SUBMITTED") {
        const jobId = event.params.jobId;
        const siteTitle = afterData.siteTitle;
        const existing = await db.collection("admin_notifications")
            .where("jobId", "==", jobId)
            .where("type", "==", "JOB_SUBMITTED")
            .limit(1)
            .get();
        if (existing.empty) {
            await db.collection("admin_notifications").add({
                type: "JOB_SUBMITTED",
                jobId: jobId,
                siteTitle: siteTitle,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                readAt: null
            });
            firebase_functions_1.logger.info(`Notification created for Job: ${jobId}`);
        }
    }
});
exports.dailyRetentionPurge = (0, scheduler_1.onSchedule)({
    schedule: "0 3 * * *",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    memory: "512MiB"
}, async () => {
    const configSnap = await admin.firestore().doc("app_config/retention").get();
    const config = configSnap.data();
    if (!config?.enabled) {
        firebase_functions_1.logger.info("Retention purge skipped: disabled in config.");
        return;
    }
    const retentionDays = config.retentionDays || 14;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const jobsToPurge = await admin.firestore()
        .collection("jobs")
        .where("status", "==", "SUBMITTED")
        .where("submittedAt", "<=", admin.firestore.Timestamp.fromDate(cutoffDate))
        .get();
    if (jobsToPurge.empty) {
        firebase_functions_1.logger.info("No jobs to purge.");
        return;
    }
    const storageBucket = admin.storage().bucket();
    for (const jobDoc of jobsToPurge.docs) {
        const jobId = jobDoc.id;
        firebase_functions_1.logger.info(`🔥 Purging job: ${jobId}`);
        try {
            await storageBucket.deleteFiles({ prefix: `jobs/${jobId}/` });
            const sections = await jobDoc.ref.collection("sections").get();
            for (const section of sections.docs) {
                const photos = await section.ref.collection("photos").get();
                for (const photo of photos.docs) {
                    await photo.ref.delete();
                }
                await section.ref.delete();
            }
            const notifs = await admin.firestore()
                .collection("admin_notifications")
                .where("jobId", "==", jobId)
                .get();
            for (const n of notifs.docs) {
                await n.ref.delete();
            }
            await jobDoc.ref.delete();
            firebase_functions_1.logger.info(`✅ Successfully purged job: ${jobId}`);
        }
        catch (error) {
            firebase_functions_1.logger.error(`❌ Failed to purge job ${jobId}:`, error);
        }
    }
});
//# sourceMappingURL=index.js.map