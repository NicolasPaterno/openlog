package model

import "time"

type CreateLogRequest struct {
	Source   string                 `json:"source"   binding:"required"`
	Level    string                 `json:"level"    binding:"required,oneof=DEBUG INFO WARN ERROR FATAL"`
	Message  string                 `json:"message"  binding:"required"`
	Metadata map[string]interface{} `json:"metadata"`
}

type LogResponse struct {
	ID        int64                  `json:"id"`
	Source    string                 `json:"source"`
	Level     string                 `json:"level"`
	Message   string                 `json:"message"`
	Metadata  map[string]interface{} `json:"metadata"`
	CreatedAt time.Time              `json:"created_at"`
}

type ListLogsResponse struct {
	Data   []LogResponse `json:"data"`
	Limit  int           `json:"limit"`
	Offset int           `json:"offset"`
}

type ErrorResponse struct {
	Error   string `json:"error"`
	Details string `json:"details,omitempty"`
}
