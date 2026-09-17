import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

export const config = {
    // Model configuration
    model: 'default',
    
    // Agent execution options
    bobOptions: {
        autoApprove: true, // Silently approve tool calls for seamless autonomous CI execution
        logLevel: 'info'
    },
    
    // Mock environment paths (for pipeline execution)
    mockEnv: {
        logDir: path.join(projectRoot, '.arsenal', 'mock_env', 'logs'),
        logFilePath: path.join(projectRoot, '.arsenal', 'mock_env', 'logs', 'run.log'),
        db2RepoPath: path.join(projectRoot, '.arsenal', 'mock_env', 'db2_repo'),
        gitDiffPath: path.join(projectRoot, '.arsenal', 'mock_env', 'git_history', 'diff.txt')
    },
    
    // Persistence and Archiving settings
    archive: {
        root: path.join(projectRoot, 'archive'),
        runsDir: path.join(projectRoot, 'archive', 'runs')
    },
    
    // General pipeline execution options
    pipeline: {
        maxIterations: 1, // Since we extract structured outputs via Output.object, maxIterations must be 1
        idleTimeoutSeconds: 300, // 5 minute idle timeout
        retryCount: 1 // Retry failed iterations once
    }
};

export default config;
