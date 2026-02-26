package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/openlog/ingestion/db/sqlc"
	"github.com/openlog/ingestion/internal/model"
	"github.com/openlog/ingestion/internal/queue"
)

type LogHandler struct {
	queries   *sqlc.Queries
	publisher *queue.Publisher
}

func NewLogHandler(q *sqlc.Queries, p *queue.Publisher) *LogHandler {
	return &LogHandler{queries: q, publisher: p}
}

func (h *LogHandler) CreateLog(c *gin.Context) {
	var req model.CreateLogRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, model.ErrorResponse{
			Error:   "invalid request body",
			Details: err.Error(),
		})
		return
	}

	metadataBytes, err := json.Marshal(req.Metadata)
	if err != nil {
		c.JSON(http.StatusBadRequest, model.ErrorResponse{
			Error:   "invalid metadata",
			Details: err.Error(),
		})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	log, err := h.queries.InsertLog(ctx, sqlc.InsertLogParams{
		Source:   req.Source,
		Level:    req.Level,
		Message:  req.Message,
		Metadata: metadataBytes,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.ErrorResponse{
			Error:   "failed to persist log",
			Details: err.Error(),
		})
		return
	}

	msg := queue.LogMessage{
		LogID:   log.ID,
		Source:  log.Source,
		Level:   log.Level,
		Message: log.Message,
	}
	if err := h.publisher.Publish(ctx, msg); err != nil {
		c.JSON(http.StatusInternalServerError, model.ErrorResponse{
			Error:   "log saved but failed to enqueue for analysis",
			Details: err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, toLogResponse(log))
}

func (h *LogHandler) GetLog(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, model.ErrorResponse{
			Error: "invalid log id",
		})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 3*time.Second)
	defer cancel()

	log, err := h.queries.GetLogByID(ctx, id)
	if err != nil {
		c.JSON(http.StatusNotFound, model.ErrorResponse{
			Error: "log not found",
		})
		return
	}

	c.JSON(http.StatusOK, toLogResponse(log))
}

func (h *LogHandler) ListLogs(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	logs, err := h.queries.ListLogs(ctx, sqlc.ListLogsParams{
		Limit:  int32(limit),
		Offset: int32(offset),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.ErrorResponse{
			Error:   "failed to list logs",
			Details: err.Error(),
		})
		return
	}

	items := make([]model.LogResponse, 0, len(logs))
	for _, l := range logs {
		items = append(items, toLogResponse(l))
	}

	c.JSON(http.StatusOK, model.ListLogsResponse{
		Data:   items,
		Limit:  limit,
		Offset: offset,
	})
}

func toLogResponse(l sqlc.Log) model.LogResponse {
	var metadata map[string]interface{}
	if len(l.Metadata) > 0 {
		_ = json.Unmarshal(l.Metadata, &metadata)
	}

	return model.LogResponse{
		ID:        l.ID,
		Source:    l.Source,
		Level:     l.Level,
		Message:   l.Message,
		Metadata:  metadata,
		CreatedAt: l.CreatedAt,
	}
}
