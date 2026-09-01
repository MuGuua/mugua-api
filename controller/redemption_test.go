package controller

import (
	"encoding/csv"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestExportRedemptionsReturnsFilteredCSV(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&model.Redemption{}))

	previousDB := model.DB
	model.DB = db
	t.Cleanup(func() {
		model.DB = previousDB
	})

	require.NoError(t, db.Create(&model.Redemption{
		Name:        "=unsafe-name",
		Key:         "safe-code",
		Status:      common.RedemptionCodeStatusEnabled,
		Quota:       500,
		CreatedTime: 1700000000,
	}).Error)
	require.NoError(t, db.Create(&model.Redemption{
		Name:   "other-name",
		Key:    "other-code",
		Status: common.RedemptionCodeStatusDisabled,
	}).Error)

	gin.SetMode(gin.TestMode)
	response := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(response)
	context.Request = httptest.NewRequest(http.MethodGet, "/api/redemption/export?keyword=%3Dunsafe-name&status=1", nil)

	ExportRedemptions(context)

	assert.Equal(t, http.StatusOK, response.Code)
	assert.Contains(t, response.Header().Get("Content-Type"), "text/csv")
	assert.Equal(t, `attachment; filename="redemption-codes.csv"`, response.Header().Get("Content-Disposition"))

	csvBody := strings.TrimPrefix(response.Body.String(), "\ufeff")
	rows, err := csv.NewReader(strings.NewReader(csvBody)).ReadAll()
	require.NoError(t, err)
	require.Len(t, rows, 2)
	assert.Equal(t, []string{"ID", "Name", "Code", "Quota", "Status", "Created At", "Redeemed At", "Expires At", "Redeemed By"}, rows[0])
	assert.Equal(t, "'=unsafe-name", rows[1][1])
	assert.Equal(t, "Unused", rows[1][4])
}
