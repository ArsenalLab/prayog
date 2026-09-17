import { run, bob, noSandbox, Output } from '@arsenallab/arsenal-light';
import config from './config.mjs';
import {
    generateRunContext,
    initializeRunDirectory,
    saveStageResult,
    saveFinalRCAArtifacts,
    saveExecutionMetadata
} from './utils/logger.mjs';

// Import prompt templates and schemas
import { promptTemplate as errorPrompt, ErrorProfileSchema } from './prompts/error_agent.mjs';
import { promptTemplate as componentPrompt, ComponentContextSchema } from './prompts/component_agent.mjs';
import { promptTemplate as prPrompt, PRBlameInfoSchema } from './prompts/pr_agent.mjs';
import { promptTemplate as rcaPrompt, RCASynthesisSchema } from './prompts/rca_agent.mjs';

/**
 * Substitutes {{KEY}} placeholders in prompt templates with actual arguments.
 * Since arsenal-light only supports promptArgs with promptFile, we perform
 * compilation in-memory here to provide a robust inline prompt pipeline.
 */
function compilePrompt(template, args) {
    let result = template;
    for (const [key, val] of Object.entries(args)) {
        result = result.replaceAll(`{{${key}}}`, String(val));
    }
    return result;
}

async function executeMultiAgentPipeline() {
    console.log("================================================================================");
    console.log("🚀 Starting Autonomous Multi-Agent RCA Orchestration Pipeline via Arsenal-Light");
    console.log("================================================================================");
    
    // 1. Initializing run-level context and folders
    const context = generateRunContext();
    console.log(`Run ID:      ${context.runId}`);
    console.log(`Timestamp:   ${context.timestamp}`);
    console.log(`Run Folder:  ${context.runPath}`);
    
    await initializeRunDirectory(context.runPath);
    console.log("✅ Run directories initialized successfully.\n");
    
    const startTime = Date.now();
    const metadata = {
        runId: context.runId,
        timestamp: context.timestamp,
        startTime: new Date(startTime).toISOString(),
        status: 'in_progress',
        stagesCompleted: [],
        totalDurationMs: 0,
        error: null
    };

    try {
        // ====================================================================
        // STAGE 1: Error Diagnostics Agent
        // ====================================================================
        console.log("--- [Stage 1/4] Running Error Diagnostics Agent ---");
        const stage1Args = { LOG_FILE_PATH: config.mockEnv.logFilePath };
        const stage1CompiledPrompt = compilePrompt(errorPrompt, stage1Args);
        
        console.log(`Scanning log file: ${config.mockEnv.logFilePath}`);
        const result1 = await run({
            agent: bob(config.model, config.bobOptions),
            sandbox: noSandbox(),
            prompt: stage1CompiledPrompt,
            output: Output.object({ tag: 'handoff_state', schema: ErrorProfileSchema }),
            maxIterations: config.pipeline.maxIterations,
            idleTimeoutSeconds: config.pipeline.idleTimeoutSeconds,
            iterationRetries: config.pipeline.retryCount
        });
        
        const errorProfile = result1.output;
        console.log("Stage 1 Output Extracted (Error Profile):");
        console.log(JSON.stringify(errorProfile, null, 2));
        
        await saveStageResult(context.runPath, '01_error_diagnostics', stage1CompiledPrompt, result1, errorProfile);
        metadata.stagesCompleted.push('01_error_diagnostics');
        console.log("✅ Stage 1 complete & persisted.\n");

        // ====================================================================
        // STAGE 2: Component & Code Context Agent
        // ====================================================================
        console.log("--- [Stage 2/4] Running Component & Code Context Agent ---");
        const stage2Args = {
            ERROR_PROFILE: JSON.stringify(errorProfile, null, 2),
            DB2_REPO_PATH: config.mockEnv.db2RepoPath
        };
        const stage2CompiledPrompt = compilePrompt(componentPrompt, stage2Args);
        
        console.log(`Analyzing DB2 repository: ${config.mockEnv.db2RepoPath}`);
        const result2 = await run({
            agent: bob(config.model, config.bobOptions),
            sandbox: noSandbox(),
            prompt: stage2CompiledPrompt,
            output: Output.object({ tag: 'handoff_state', schema: ComponentContextSchema }),
            maxIterations: config.pipeline.maxIterations,
            idleTimeoutSeconds: config.pipeline.idleTimeoutSeconds,
            iterationRetries: config.pipeline.retryCount
        });
        
        const componentContext = result2.output;
        console.log("Stage 2 Output Extracted (Component Context):");
        console.log(JSON.stringify(componentContext, null, 2));
        
        await saveStageResult(context.runPath, '02_component_context', stage2CompiledPrompt, result2, componentContext);
        metadata.stagesCompleted.push('02_component_context');
        console.log("✅ Stage 2 complete & persisted.\n");

        // ====================================================================
        // STAGE 3: PR & Regression Blame Agent
        // ====================================================================
        console.log("--- [Stage 3/4] Running PR & Regression Blame Agent ---");
        const stage3Args = {
            COMPONENT_CONTEXT: JSON.stringify(componentContext, null, 2),
            GIT_DIFF_PATH: config.mockEnv.gitDiffPath
        };
        const stage3CompiledPrompt = compilePrompt(prPrompt, stage3Args);
        
        console.log(`Inspecting git diff history: ${config.mockEnv.gitDiffPath}`);
        const result3 = await run({
            agent: bob(config.model, config.bobOptions),
            sandbox: noSandbox(),
            prompt: stage3CompiledPrompt,
            output: Output.object({ tag: 'handoff_state', schema: PRBlameInfoSchema }),
            maxIterations: config.pipeline.maxIterations,
            idleTimeoutSeconds: config.pipeline.idleTimeoutSeconds,
            iterationRetries: config.pipeline.retryCount
        });
        
        const prBlameInfo = result3.output;
        console.log("Stage 3 Output Extracted (PR Blame Info):");
        console.log(JSON.stringify(prBlameInfo, null, 2));
        
        await saveStageResult(context.runPath, '03_pr_blame', stage3CompiledPrompt, result3, prBlameInfo);
        metadata.stagesCompleted.push('03_pr_blame');
        console.log("✅ Stage 3 complete & persisted.\n");

        // ====================================================================
        // STAGE 4: RCA & Code Review Synthesis Agent
        // ====================================================================
        console.log("--- [Stage 4/4] Running RCA & Code Review Synthesis Agent ---");
        const stage4Args = {
            PR_BLAME_INFO: JSON.stringify(prBlameInfo, null, 2)
        };
        const stage4CompiledPrompt = compilePrompt(rcaPrompt, stage4Args);
        
        const result4 = await run({
            agent: bob(config.model, config.bobOptions),
            sandbox: noSandbox(),
            prompt: stage4CompiledPrompt,
            output: Output.object({ tag: 'handoff_state', schema: RCASynthesisSchema }),
            maxIterations: config.pipeline.maxIterations,
            idleTimeoutSeconds: config.pipeline.idleTimeoutSeconds,
            iterationRetries: config.pipeline.retryCount
        });
        
        const rcaSynthesis = result4.output;
        console.log("Stage 4 Output Extracted (RCA Synthesis):");
        console.log(JSON.stringify(rcaSynthesis, null, 2));
        
        // Save intermediate outputs for Stage 4
        await saveStageResult(context.runPath, '04_rca_review', stage4CompiledPrompt, result4, rcaSynthesis);
        
        // Assemble and save production final review comment and complete pipeline run summary
        const fullSummary = {
            runId: context.runId,
            timestamp: context.timestamp,
            stages: {
                errorDiagnostics: errorProfile,
                componentContext: componentContext,
                prBlameInfo: prBlameInfo,
                rcaSynthesis: rcaSynthesis
            }
        };
        
        await saveFinalRCAArtifacts(context.runPath, rcaSynthesis.actionableReviewComment, fullSummary);
        metadata.stagesCompleted.push('04_rca_review');
        console.log("✅ Stage 4 complete & persisted final code review artifacts.\n");

        // Finalize metadata
        const endTime = Date.now();
        metadata.status = 'success';
        metadata.endTime = new Date(endTime).toISOString();
        metadata.totalDurationMs = endTime - startTime;
        
        await saveExecutionMetadata(context.runPath, metadata);
        
        console.log("================================================================================");
        console.log(`🎉 Pipeline Executed Successfully! Run duration: ${(metadata.totalDurationMs / 1000).toFixed(2)}s`);
        console.log(`All logs and intermediate payloads saved under: ${context.runPath}`);
        console.log("================================================================================");
        
    } catch (error) {
        console.error("\n❌ PIPELINE EXECUTION FAILURE:", error);
        
        const endTime = Date.now();
        metadata.status = 'failed';
        metadata.endTime = new Date(endTime).toISOString();
        metadata.totalDurationMs = endTime - startTime;
        metadata.error = {
            message: error.message,
            stack: error.stack,
            stage: metadata.stagesCompleted.length + 1
        };
        
        try {
            await saveExecutionMetadata(context.runPath, metadata);
        } catch (writeErr) {
            console.error("Failed to save final execution metadata after failure:", writeErr);
        }
        
        process.exit(1);
    }
}

// Execute the pipeline
executeMultiAgentPipeline();
