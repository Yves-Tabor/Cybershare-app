-- ============================================
-- Production-Ready Scanning System Schema
-- ============================================

-- Drop existing scan tables if they exist (for migration)
DROP TABLE IF EXISTS scan_results CASCADE;
DROP TABLE IF EXISTS scans CASCADE;

-- ============================================
-- Scan Jobs Table
-- Main job tracking with queue integration
-- ============================================
CREATE TABLE IF NOT EXISTS scan_jobs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Target information
  target_url VARCHAR(500) NOT NULL,
  target_hostname VARCHAR(255),
  target_ip INET,
  
  -- Job lifecycle
  status VARCHAR(20) DEFAULT 'queued' CHECK (status IN (
    'queued', 'validating', 'running_httpx', 'running_nmap', 
    'running_nuclei', 'parsing', 'completed', 'failed', 'cancelled'
  )),
  
  -- Queue metadata
  queue_job_id VARCHAR(255), -- BullMQ job ID
  priority INTEGER DEFAULT 0,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Timing
  queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  failed_at TIMESTAMP,
  
  -- Results
  security_score INTEGER,
  total_findings INTEGER DEFAULT 0,
  critical_findings INTEGER DEFAULT 0,
  high_findings INTEGER DEFAULT 0,
  medium_findings INTEGER DEFAULT 0,
  low_findings INTEGER DEFAULT 0,
  info_findings INTEGER DEFAULT 0,
  
  -- Error handling
  error_message TEXT,
  error_code VARCHAR(50),
  
  -- Metadata
  scan_type VARCHAR(50) DEFAULT 'standard',
  scan_options JSONB DEFAULT '{}',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for scan_jobs
CREATE INDEX IF NOT EXISTS idx_scan_jobs_user_id ON scan_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_jobs_status ON scan_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scan_jobs_queue_job_id ON scan_jobs(queue_job_id);
CREATE INDEX IF NOT EXISTS idx_scan_jobs_created_at ON scan_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_jobs_status_created_at ON scan_jobs(status, created_at DESC);

-- ============================================
-- Scan Targets Table
-- Target validation and metadata
-- ============================================
CREATE TABLE IF NOT EXISTS scan_targets (
  id SERIAL PRIMARY KEY,
  scan_job_id INTEGER NOT NULL REFERENCES scan_jobs(id) ON DELETE CASCADE,
  
  -- Target details
  url VARCHAR(500) NOT NULL,
  hostname VARCHAR(255) NOT NULL,
  ip_address INET,
  port INTEGER,
  
  -- Validation results
  is_valid BOOLEAN DEFAULT false,
  validation_method VARCHAR(50),
  is_reachable BOOLEAN DEFAULT false,
  protocol VARCHAR(10),
  
  -- HTTP metadata (from HTTPX)
  http_status INTEGER,
  http_server VARCHAR(255),
  content_type VARCHAR(255),
  content_length BIGINT,
  response_time_ms INTEGER,
  
  -- Technology detection
  technologies JSONB DEFAULT '[]',
  
  -- Security flags
  is_localhost BOOLEAN DEFAULT false,
  is_private_ip BOOLEAN DEFAULT false,
  is_reserved_ip BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(scan_job_id, url)
);

CREATE INDEX IF NOT EXISTS idx_scan_targets_scan_job_id ON scan_targets(scan_job_id);
CREATE INDEX IF NOT EXISTS idx_scan_targets_hostname ON scan_targets(hostname);

-- ============================================
-- Scan Results Table
-- Aggregated results per scanner stage
-- ============================================
CREATE TABLE IF NOT EXISTS scan_results (
  id SERIAL PRIMARY KEY,
  scan_job_id INTEGER NOT NULL REFERENCES scan_jobs(id) ON DELETE CASCADE,
  
  -- Scanner stage
  scanner_name VARCHAR(50) NOT NULL, -- 'httpx', 'nmap', 'nuclei', etc.
  scanner_stage VARCHAR(50) NOT NULL,
  
  -- Execution metadata
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  duration_ms INTEGER,
  
  -- Results
  success BOOLEAN DEFAULT false,
  findings_count INTEGER DEFAULT 0,
  
  -- Raw output storage
  raw_output TEXT,
  raw_output_path VARCHAR(500),
  
  -- Parsed data
  parsed_data JSONB DEFAULT '{}',
  
  -- Error handling
  error_message TEXT,
  exit_code INTEGER,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scan_results_scan_job_id ON scan_results(scan_job_id);
CREATE INDEX IF NOT EXISTS idx_scan_results_scanner_name ON scan_results(scanner_name);
CREATE INDEX IF NOT EXISTS idx_scan_results_scanner_stage ON scan_results(scanner_stage);

-- ============================================
-- Scan Findings Table
-- Individual security findings
-- ============================================
CREATE TABLE IF NOT EXISTS scan_findings (
  id SERIAL PRIMARY KEY,
  scan_job_id INTEGER NOT NULL REFERENCES scan_jobs(id) ON DELETE CASCADE,
  scan_result_id INTEGER REFERENCES scan_results(id) ON DELETE CASCADE,
  
  -- Finding details
  category VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN (
    'critical', 'high', 'medium', 'low', 'informational'
  )),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  recommendation TEXT,
  
  -- Tool-specific metadata
  scanner_name VARCHAR(50) NOT NULL,
  template_id VARCHAR(255), -- For Nuclei templates
  cve_id VARCHAR(50),
  cvss_score DECIMAL(3,1),
  
  -- Location
  target_url VARCHAR(500),
  port INTEGER,
  path VARCHAR(500),
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}',
  references TEXT[],
  
  -- Status
  is_false_positive BOOLEAN DEFAULT false,
  is_resolved BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scan_findings_scan_job_id ON scan_findings(scan_job_id);
CREATE INDEX IF NOT EXISTS idx_scan_findings_severity ON scan_findings(severity);
CREATE INDEX IF NOT EXISTS idx_scan_findings_category ON scan_findings(category);
CREATE INDEX IF NOT EXISTS idx_scan_findings_scanner_name ON scan_findings(scanner_name);
CREATE INDEX IF NOT EXISTS idx_scan_findings_template_id ON scan_findings(template_id);

-- ============================================
-- Scan Progress Table
-- Stage-by-stage progress tracking
-- ============================================
CREATE TABLE IF NOT EXISTS scan_progress (
  id SERIAL PRIMARY KEY,
  scan_job_id INTEGER NOT NULL REFERENCES scan_jobs(id) ON DELETE CASCADE,
  
  -- Stage information
  stage_name VARCHAR(50) NOT NULL, -- 'validating', 'httpx', 'nmap', 'nuclei', 'parsing'
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending', 'running', 'completed', 'failed', 'skipped'
  )),
  
  -- Progress
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  current_step VARCHAR(255),
  total_steps INTEGER,
  completed_steps INTEGER DEFAULT 0,
  
  -- Timing
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  duration_ms INTEGER,
  
  -- Messages
  message TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(scan_job_id, stage_name)
);

CREATE INDEX IF NOT EXISTS idx_scan_progress_scan_job_id ON scan_progress(scan_job_id);
CREATE INDEX IF NOT EXISTS idx_scan_progress_stage_name ON scan_progress(stage_name);
CREATE INDEX IF NOT EXISTS idx_scan_progress_status ON scan_progress(status);

-- ============================================
-- Scan Logs Table
-- Execution logs for debugging and auditing
-- ============================================
CREATE TABLE IF NOT EXISTS scan_logs (
  id SERIAL PRIMARY KEY,
  scan_job_id INTEGER NOT NULL REFERENCES scan_jobs(id) ON DELETE CASCADE,
  
  -- Log details
  level VARCHAR(20) NOT NULL CHECK (level IN (
    'debug', 'info', 'warn', 'error', 'fatal'
  )),
  stage VARCHAR(50),
  message TEXT NOT NULL,
  
  -- Context
  context JSONB DEFAULT '{}',
  
  -- Timing
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scan_logs_scan_job_id ON scan_logs(scan_job_id);
CREATE INDEX IF NOT EXISTS idx_scan_logs_level ON scan_logs(level);
CREATE INDEX IF NOT EXISTS idx_scan_logs_timestamp ON scan_logs(timestamp DESC);

-- ============================================
-- Create a view for backward compatibility with existing scans API
-- ============================================
CREATE OR REPLACE VIEW scans AS
SELECT 
  id,
  target_url AS target_url,
  user_id,
  status,
  security_score,
  created_at,
  completed_at AS completed_at
FROM scan_jobs;

-- ============================================
-- Trigger to update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_scan_jobs_updated_at BEFORE UPDATE ON scan_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scan_targets_updated_at BEFORE UPDATE ON scan_targets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scan_progress_updated_at BEFORE UPDATE ON scan_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Comments for documentation
-- ============================================
COMMENT ON TABLE scan_jobs IS 'Main scan job tracking table with queue integration';
COMMENT ON TABLE scan_targets IS 'Target validation and metadata storage';
COMMENT ON TABLE scan_results IS 'Aggregated results per scanner stage';
COMMENT ON TABLE scan_findings IS 'Individual security findings from scanners';
COMMENT ON TABLE scan_progress IS 'Stage-by-stage progress tracking';
COMMENT ON TABLE scan_logs IS 'Execution logs for debugging and auditing';
