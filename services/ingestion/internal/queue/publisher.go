package queue

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

const (
	exchangeName = ""
	queueName    = "logs.analyze"
	maxRetries   = 5
)

type LogMessage struct {
	LogID   int64  `json:"log_id"`
	Source  string `json:"source"`
	Level   string `json:"level"`
	Message string `json:"message"`
}

type Publisher struct {
	conn    *amqp.Connection
	channel *amqp.Channel
}

func NewPublisher(url string) (*Publisher, error) {
	conn, err := connectWithRetry(url, maxRetries)
	if err != nil {
		return nil, fmt.Errorf("rabbitmq connection failed: %w", err)
	}

	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("rabbitmq channel failed: %w", err)
	}

	_, err = ch.QueueDeclare(
		queueName,
		true,  // durable
		false, // auto-delete
		false, // exclusive
		false, // no-wait
		nil,
	)
	if err != nil {
		ch.Close()
		conn.Close()
		return nil, fmt.Errorf("queue declare failed: %w", err)
	}

	log.Printf("Connected to RabbitMQ, queue '%s' ready", queueName)
	return &Publisher{conn: conn, channel: ch}, nil
}

func (p *Publisher) Publish(ctx context.Context, msg LogMessage) error {
	body, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("marshal failed: %w", err)
	}

	return p.channel.PublishWithContext(ctx,
		exchangeName,
		queueName,
		false, // mandatory
		false, // immediate
		amqp.Publishing{
			DeliveryMode: amqp.Persistent,
			ContentType:  "application/json",
			Body:         body,
			Timestamp:    time.Now(),
		},
	)
}

func (p *Publisher) Close() {
	if p.channel != nil {
		p.channel.Close()
	}
	if p.conn != nil {
		p.conn.Close()
	}
}

func connectWithRetry(url string, retries int) (*amqp.Connection, error) {
	var conn *amqp.Connection
	var err error

	for i := 0; i < retries; i++ {
		conn, err = amqp.Dial(url)
		if err == nil {
			return conn, nil
		}

		wait := time.Duration(1<<uint(i)) * time.Second
		log.Printf("RabbitMQ not ready (attempt %d/%d), retrying in %v: %v", i+1, retries, wait, err)
		time.Sleep(wait)
	}

	return nil, fmt.Errorf("failed after %d retries: %w", retries, err)
}
