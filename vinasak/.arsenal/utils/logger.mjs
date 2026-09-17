import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import config from '../config.mjs';

/**
 * Generates a unique run ID and timestamp-based directory name.
 * Format: run-[short_id]_[YYYYMMDD_HHMMSS]
 */
export function generateRunContext() {
    const runId = `run-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date();
    const timestamp = now.toISOString()
        .replace(/[:.]/g, '-') // Replace colons and dots with hyphens
        .replace('T', '_')      // Replace T with underscore
        .slice(0, 19);          // Format: YYYY-MM-DD_HH-MM-SS
    
    const runDirName = `${runId}_${timestamp}`;
    const runPath = path.join(config.archive.runsDir, runDirName);
    
    return {
        runId,
        timestamp: now.toISOString(),
        runDirName,
        runPath
    };
}

/**
 * Initializes the structured directory layout for a run.
 */
export async function initializeRunDirectory(runPath) {
    const stages = [
        '01_error_diagnostics',
        '02_component_context',
        '03_pr_blame',
        '04_rca_review'
    ];
    
    // Create base runs directory if it doesn't exist
    await fs.mkdir(config.archive.runsDir, { recursive: true });
    
    // Create current run directory and sub-directories for each stage
    for (const stage of stages) {
        const stagePath = path.join(runPath, stage);
        await fs.mkdir(stagePath, { recursive: true });
    }
}

/**
 * Saves all intermediate artifacts for a specific agent stage.
 */
export async function saveStageResult(runPath, stageFolderName, prompt, runResult, handoffState) {
    const stageDir = path.join(runPath, stageFolderName);
    
    // 1. Save prompt.txt
    await fs.writeFile(
        path.join(stageDir, 'prompt.txt'),
        prompt,
        'utf8'
    );
    
    // 2. Save raw_response.json (the full run result containing stdout, iterations, etc.)
    await fs.writeFile(
        path.join(stageDir, 'raw_response.json'),
        JSON.stringify(runResult, null, 2),
        'utf8'
    );
    
    // 3. Save handoff_state.json (the parsed and validated output)
    await fs.writeFile(
        path.join(stageDir, 'handoff_state.json'),
        JSON.stringify(handoffState, null, 2),
        'utf8'
    );
}

/**
 * Saves specific final stage output files for RCA Synthesis.
 */
export async function saveFinalRCAArtifacts(runPath, mdComment, fullSummary) {
    const rcaDir = path.join(runPath, '04_rca_review');
    
    // 1. Save final_review_comment.md
    await fs.writeFile(
        path.join(rcaDir, 'final_review_comment.md'),
        mdComment,
        'utf8'
    );
    
    // 2. Save full_run_summary.json
    await fs.writeFile(
        path.join(rcaDir, 'full_run_summary.json'),
        JSON.stringify(fullSummary, null, 2),
        'utf8'
    );
}

/**
 * Saves overall execution metadata at the root of the run folder.
 */
export async function saveExecutionMetadata(runPath, metadata) {
    await fs.writeFile(
        path.join(runPath, 'execution_metadata.json'),
        JSON.stringify(metadata, null, 2),
        'utf8'
    );
}
