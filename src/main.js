import './style.css';

// Constants for category icons and colors
const CATEGORIES = {
    Food: { icon: 'fa-utensils', color: '#FF6B6B' },
    Housing: { icon: 'fa-home', color: '#4ECDC4' },
    Transportation: { icon: 'fa-car', color: '#45B7D1' },
    Entertainment: { icon: 'fa-film', color: '#96CEB4' },
    Shopping: { icon: 'fa-shopping-bag', color: '#FFBE0B' },
    Healthcare: { icon: 'fa-medkit', color: '#FF006E' },
    Utilities: { icon: 'fa-bolt', color: '#8338EC' },
    Education: { icon: 'fa-graduation-cap', color: '#3A86FF' },
    Investment: { icon: 'fa-chart-line', color: '#38B000' },
    Other: { icon: 'fa-ellipsis-h', color: '#5A189A' }
};

// Data Management
class FinanceManager {
    constructor() {
        this.transactions = JSON.parse(localStorage.getItem('transactions')) || [];
        this.budgets = JSON.parse(localStorage.getItem('budgets')) || [];
        this.initializeEventListeners();
        this.updateUI();
    }

    // Storage Methods
    saveTransactions() {
        localStorage.setItem('transactions', JSON.stringify(this.transactions));
        this.updateUI();
    }

    saveBudgets() {
        localStorage.setItem('budgets', JSON.stringify(this.budgets));
        this.updateUI();
    }

    // Transaction Methods
    addTransaction(transaction) {
        this.transactions.push({
            ...transaction,
            id: Date.now().toString(),
            timestamp: new Date().toISOString()
        });
        this.saveTransactions();
        this.showToast('Transaction added successfully', 'success');
    }

    editTransaction(id, updatedTransaction) {
        const index = this.transactions.findIndex(t => t.id === id);
        if (index !== -1) {
            this.transactions[index] = { ...this.transactions[index], ...updatedTransaction };
            this.saveTransactions();
            this.showToast('Transaction updated successfully', 'success');
        }
    }

    deleteTransaction(id) {
        this.transactions = this.transactions.filter(t => t.id !== id);
        this.saveTransactions();
        this.showToast('Transaction deleted successfully', 'success');
    }

    // Budget Methods
    addBudget(budget) {
        const existingBudget = this.budgets.find(
            b => b.category === budget.category && b.month === budget.month
        );
        
        if (existingBudget) {
            existingBudget.amount = budget.amount;
            this.showToast('Budget updated successfully', 'success');
        } else {
            this.budgets.push({
                ...budget,
                id: Date.now().toString()
            });
            this.showToast('Budget added successfully', 'success');
        }
        this.saveBudgets();
    }

    deleteBudget(id) {
        this.budgets = this.budgets.filter(b => b.id !== id);
        this.saveBudgets();
        this.showToast('Budget deleted successfully', 'success');
    }

    // Calculation Methods
    calculateTotals() {
        const totals = {
            income: 0,
            expenses: 0,
            netBalance: 0,
            topCategory: { category: '', amount: 0 },
            categoryTotals: {}
        };

        this.transactions.forEach(transaction => {
            const amount = parseFloat(transaction.amount);
            if (transaction.type === 'income') {
                totals.income += amount;
            } else {
                totals.expenses += amount;
                totals.categoryTotals[transaction.category] = 
                    (totals.categoryTotals[transaction.category] || 0) + amount;
            }
        });

        totals.netBalance = totals.income - totals.expenses;

        // Find top expense category
        Object.entries(totals.categoryTotals).forEach(([category, amount]) => {
            if (amount > totals.topCategory.amount) {
                totals.topCategory = { category, amount };
            }
        });

        return totals;
    }

    calculateBudgetStatus(category, month) {
        const budget = this.budgets.find(b => b.category === category && b.month === month);
        if (!budget) return null;

        const expenses = this.transactions
            .filter(t => t.type === 'expense' && 
                        t.category === category && 
                        t.date.startsWith(month))
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);

        const percentUsed = (expenses / budget.amount) * 100;
        let status = 'Under budget';
        let color = 'var(--income-color)';

        if (percentUsed >= 90) {
            status = 'Over budget';
            color = 'var(--expense-color)';
        } else if (percentUsed >= 75) {
            status = 'Almost at limit';
            color = 'var(--warning-color)';
        }

        return {
            budgeted: budget.amount,
            spent: expenses,
            remaining: budget.amount - expenses,
            percentUsed,
            status,
            color
        };
    }

    // UI Update Methods
    updateUI() {
        this.updateDashboard();
        this.updateTransactionsTable();
        this.updateBudgets();
        this.updateCharts();
    }

    updateDashboard() {
        const totals = this.calculateTotals();
        
        // Update summary cards
        document.getElementById('totalIncome').textContent = this.formatCurrency(totals.income);
        document.getElementById('totalExpenses').textContent = this.formatCurrency(totals.expenses);
        document.getElementById('netBalance').textContent = this.formatCurrency(Math.abs(totals.netBalance));
        document.getElementById('balanceLabel').textContent = totals.netBalance >= 0 ? 'Surplus' : 'Deficit';
        document.getElementById('topCategory').textContent = totals.topCategory.category 
            ? `${totals.topCategory.category} (${this.formatCurrency(totals.topCategory.amount)})` 
            : 'No expenses yet';

        // Update recent transaction
        const recentTransaction = this.transactions[this.transactions.length - 1];
        if (recentTransaction) {
            document.getElementById('recentTransaction').innerHTML = `
                <p class="description">${recentTransaction.description}</p>
                <p class="details">
                    <span class="category">${recentTransaction.category}</span>
                    <span class="amount ${recentTransaction.type}">${this.formatCurrency(recentTransaction.amount)}</span>
                </p>
                <p class="date">${new Date(recentTransaction.date).toLocaleDateString()}</p>
            `;
        }
    }

    updateTransactionsTable() {
        const tbody = document.getElementById('transactionsTableBody');
        tbody.innerHTML = '';

        this.transactions
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .forEach(transaction => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${new Date(transaction.date).toLocaleDateString()}</td>
                    <td>${transaction.description}</td>
                    <td>
                        <i class="fas ${CATEGORIES[transaction.category]?.icon}"></i>
                        ${transaction.category}
                    </td>
                    <td class="${transaction.type}">
                        ${this.formatCurrency(transaction.amount)}
                    </td>
                    <td>${transaction.type}</td>
                    <td>
                        <button class="edit-transaction" data-id="${transaction.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-transaction" data-id="${transaction.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
    }

    updateBudgets() {
        const budgetsList = document.getElementById('budgetsList');
        budgetsList.innerHTML = '';

        const currentMonth = new Date().toISOString().slice(0, 7);
        Object.keys(CATEGORIES).forEach(category => {
            const status = this.calculateBudgetStatus(category, currentMonth);
            if (!status) return;

            const budgetItem = document.createElement('div');
            budgetItem.className = 'budget-item';
            budgetItem.innerHTML = `
                <div class="budget-header">
                    <i class="fas ${CATEGORIES[category].icon}"></i>
                    <h3>${category}</h3>
                </div>
                <div class="budget-details">
                    <p>Budgeted: ${this.formatCurrency(status.budgeted)}</p>
                    <p>Spent: ${this.formatCurrency(status.spent)}</p>
                    <p>Remaining: ${this.formatCurrency(status.remaining)}</p>
                </div>
                <div class="progress-bar">
                    <div class="progress-bar-fill" style="
                        width: ${Math.min(status.percentUsed, 100)}%;
                        background-color: ${status.color}">
                    </div>
                </div>
                <p class="budget-status" style="color: ${status.color}">${status.status}</p>
            `;
            budgetsList.appendChild(budgetItem);
        });
    }

    updateCharts() {
        this.updateMonthlyExpensesChart();
        this.updateCategoryPieChart();
        this.updateBudgetVsActualChart();
    }

    updateMonthlyExpensesChart() {
        const monthlyData = {
            income: {},
            expense: {}
        };
        
        this.transactions.forEach(t => {
            const month = t.date.slice(0, 7);
            const type = t.type;
            monthlyData[type][month] = (monthlyData[type][month] || 0) + parseFloat(t.amount);
        });

        const months = [...new Set([
            ...Object.keys(monthlyData.income),
            ...Object.keys(monthlyData.expense)
        ])].sort();

        const ctx = document.getElementById('monthlyExpensesChart').getContext('2d');
        if (this.monthlyChart) this.monthlyChart.destroy();
        
        this.monthlyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: months.map(m => new Date(m).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })),
                datasets: [
                    {
                        label: 'Income',
                        data: months.map(m => monthlyData.income[m] || 0),
                        backgroundColor: 'rgba(46, 204, 113, 0.7)',
                        borderColor: '#2ecc71',
                        borderWidth: 2
                    },
                    {
                        label: 'Expenses',
                        data: months.map(m => monthlyData.expense[m] || 0),
                        backgroundColor: 'rgba(231, 76, 60, 0.7)',
                        borderColor: '#e74c3c',
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Monthly Income vs Expenses',
                        color: '#1a1a1a',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        labels: {
                            color: '#1a1a1a'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            color: '#1a1a1a',
                            callback: value => this.formatCurrency(value)
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            color: '#1a1a1a'
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#1a1a1a'
                        }
                    },
                    title: {
                        color: '#1a1a1a'
                    }
                }
            }
        });
    }

    updateCategoryPieChart() {
        const categoryData = {};
        const currentMonth = new Date().toISOString().slice(0, 7);
        
        this.transactions
            .filter(t => t.type === 'expense' && t.date.startsWith(currentMonth))
            .forEach(t => {
                categoryData[t.category] = (categoryData[t.category] || 0) + parseFloat(t.amount);
            });

        const categories = Object.keys(categoryData);
        const data = categories.map(category => categoryData[category]);
        const colors = categories.map(category => {
            const color = CATEGORIES[category]?.color || '#95a5a6';
            return `${color}CC`; // Add transparency
        });

        const ctx = document.getElementById('categoryPieChart').getContext('2d');
        if (this.pieChart) this.pieChart.destroy();

        this.pieChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categories,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderColor: colors.map(color => color.replace('CC', '')),
                    borderWidth: 2,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Current Month Expenses by Category',
                        color: '#1a1a1a',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#1a1a1a',
                            usePointStyle: true,
                            padding: 20,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: context => {
                                const value = context.raw;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${context.label}: ${this.formatCurrency(value)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    updateBudgetVsActualChart() {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const categories = Object.keys(CATEGORIES);
        const budgeted = [];
        const actual = [];
        const remaining = [];

        categories.forEach(category => {
            const budget = this.budgets.find(b => b.category === category && b.month === currentMonth);
            const expenses = this.transactions
                .filter(t => t.type === 'expense' && 
                           t.category === category && 
                           t.date.startsWith(currentMonth))
                .reduce((sum, t) => sum + parseFloat(t.amount), 0);
            
            const budgetAmount = budget ? budget.amount : 0;
            budgeted.push(budgetAmount);
            actual.push(expenses);
            remaining.push(Math.max(0, budgetAmount - expenses));
        });

        const ctx = document.getElementById('budgetVsActualChart').getContext('2d');
        if (this.budgetChart) this.budgetChart.destroy();

        this.budgetChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: categories,
                datasets: [
                    {
                        label: 'Budgeted',
                        data: budgeted,
                        backgroundColor: 'rgba(52, 152, 219, 0.7)',
                        borderColor: '#3498db',
                        borderWidth: 2
                    },
                    {
                        label: 'Spent',
                        data: actual,
                        backgroundColor: 'rgba(231, 76, 60, 0.7)',
                        borderColor: '#e74c3c',
                        borderWidth: 2
                    },
                    {
                        label: 'Remaining',
                        data: remaining,
                        backgroundColor: 'rgba(46, 204, 113, 0.7)',
                        borderColor: '#2ecc71',
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Budget vs Actual Spending (Current Month)',
                        color: '#1a1a1a',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        labels: {
                            color: '#1a1a1a'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: context => {
                                return `${context.dataset.label}: ${this.formatCurrency(context.raw)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        stacked: false,
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            color: '#1a1a1a',
                            callback: value => this.formatCurrency(value)
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            color: '#1a1a1a',
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                }
            }
        });
    }

    // Utility Methods
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        const container = document.getElementById('toastContainer');
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    // Event Listeners
    initializeEventListeners() {

        // Transaction modal
        document.getElementById('addTransactionBtn').addEventListener('click', () => {
            this.openTransactionModal();
        });

        document.getElementById('transactionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleTransactionSubmit(e.target);
        });

        // Budget modal
        document.getElementById('addBudgetBtn').addEventListener('click', () => {
            this.openBudgetModal();
        });

        document.getElementById('budgetForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleBudgetSubmit(e.target);
        });

        // Transaction table actions
        document.getElementById('transactionsTableBody').addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;

            const id = button.dataset.id;
            if (button.classList.contains('edit-transaction')) {
                this.openTransactionModal(id);
            } else if (button.classList.contains('delete-transaction')) {
                if (confirm('Are you sure you want to delete this transaction?')) {
                    this.deleteTransaction(id);
                }
            }
        });

        // Filters
        document.getElementById('searchTransactions').addEventListener('input', (e) => {
            this.filterTransactions(e.target.value);
        });

        ['categoryFilter', 'typeFilter'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => {
                this.filterTransactions();
            });
        });

        // Initialize category selects
        ['transactionCategory', 'budgetCategory'].forEach(id => {
            const select = document.getElementById(id);
            Object.keys(CATEGORIES).forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                select.appendChild(option);
            });
        });
    }

    openTransactionModal(transactionId = null) {
        const modal = document.getElementById('transactionModal');
        const form = document.getElementById('transactionForm');
        const title = document.getElementById('transactionModalTitle');

        if (transactionId) {
            const transaction = this.transactions.find(t => t.id === transactionId);
            if (transaction) {
                title.textContent = 'Edit Transaction';
                form.elements.transactionType.value = transaction.type;
                form.elements.transactionDescription.value = transaction.description;
                form.elements.transactionAmount.value = transaction.amount;
                form.elements.transactionDate.value = transaction.date;
                form.elements.transactionCategory.value = transaction.category;
                form.dataset.editId = transactionId;
            }
        } else {
            title.textContent = 'Add Transaction';
            form.reset();
            delete form.dataset.editId;
            form.elements.transactionDate.value = new Date().toISOString().slice(0, 10);
        }

        modal.style.display = 'block';
    }

    openBudgetModal() {
        const modal = document.getElementById('budgetModal');
        const form = document.getElementById('budgetForm');
        
        form.reset();
        form.elements.budgetMonth.value = new Date().toISOString().slice(0, 7);
        modal.style.display = 'block';
    }

    handleTransactionSubmit(form) {
        const transaction = {
            type: form.elements.transactionType.value,
            description: form.elements.transactionDescription.value,
            amount: parseFloat(form.elements.transactionAmount.value),
            date: form.elements.transactionDate.value,
            category: form.elements.transactionCategory.value
        };

        if (form.dataset.editId) {
            this.editTransaction(form.dataset.editId, transaction);
        } else {
            this.addTransaction(transaction);
        }

        document.getElementById('transactionModal').style.display = 'none';
        form.reset();
    }

    handleBudgetSubmit(form) {
        const budget = {
            category: form.elements.budgetCategory.value,
            amount: parseFloat(form.elements.budgetAmount.value),
            month: form.elements.budgetMonth.value
        };

        this.addBudget(budget);
        document.getElementById('budgetModal').style.display = 'none';
        form.reset();
    }

    filterTransactions(searchText = '') {
        const rows = document.getElementById('transactionsTableBody').getElementsByTagName('tr');
        const categoryFilter = document.getElementById('categoryFilter').value.toLowerCase();
        const typeFilter = document.getElementById('typeFilter').value.toLowerCase();
        searchText = searchText.toLowerCase();

        Array.from(rows).forEach(row => {
            const category = row.cells[2].textContent.toLowerCase();
            const type = row.cells[4].textContent.toLowerCase();
            const text = row.cells[1].textContent.toLowerCase();

            const matchesCategory = !categoryFilter || category.includes(categoryFilter);
            const matchesType = !typeFilter || type === typeFilter;
            const matchesSearch = !searchText || text.includes(searchText);

            row.style.display = matchesCategory && matchesType && matchesSearch ? '' : 'none';
        });
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    window.financeManager = new FinanceManager();
});
