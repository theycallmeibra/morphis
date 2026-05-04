/**
 * Morphis Client-Side SDK
 * Dependency-free Vanilla JS for injecting AI-generated analytics UIs
 * - Renders prompt input in target container
 * - Sends prompts to Morphis backend
 * - Injects generated UIs into secure sandboxed iframes
 */

(function () {
    // Global Morphis object exposed to window
    window.Morphis = {
        /**
         * Initialize the Morphis SDK
         * @param {Object} config - Configuration object
         * @param {string} config.apiKey - Your Morphis API key
         * @param {string} config.containerId - ID of the target container element
         * @param {Object} config.apiSchema - Allowed API endpoints for generated UIs
         */
        init: function (config) {
            // Validate required config fields
            if (!config.apiKey) throw new Error('Morphis.init: apiKey is required');
            if (!config.containerId) throw new Error('Morphis.init: containerId is required');
            if (!config.apiSchema) throw new Error('Morphis.init: apiSchema is required');

            const { apiKey, containerId, apiSchema } = config;

            // Get target container element
            const container = document.getElementById(containerId);
            if (!container) {
                console.error(`Morphis: Container with id "${containerId}" not found`);
                return;
            }

            // Store config and container for later use
            this.config = config;
            this.container = container;

            // Render the SDK UI (prompt input, loading state, iframe)
            this.renderUI();
        },

        /**
         * Render all SDK UI elements into the target container
         */
        renderUI: function () {
            const self = this;
            const container = this.container;

            // Clear container (in case init is called multiple times)
            container.innerHTML = '';

            // Inject SDK-specific styles into document head
            this.injectStyles();

            // 1. Prompt Input Container
            const promptContainer = document.createElement('div');
            promptContainer.className = 'morphis-prompt-container';

            const promptInput = document.createElement('input');
            promptInput.type = 'text';
            promptInput.placeholder = 'Type your prompt to generate analytics UI...';
            promptInput.className = 'morphis-prompt-input';

            const generateBtn = document.createElement('button');
            generateBtn.textContent = 'Generate';
            generateBtn.className = 'morphis-generate-btn';

            promptContainer.appendChild(promptInput);
            promptContainer.appendChild(generateBtn);

            // 2. Loading State (hidden by default)
            const loadingState = document.createElement('div');
            loadingState.className = 'morphis-loading';
            loadingState.style.display = 'none';
            loadingState.innerHTML = `
                <div class="morphis-spinner"></div>
                <div>Generating UI...</div>
            `;

            // 3. Sandboxed Iframe (hidden until content loads)
            const iframe = document.createElement('iframe');
            iframe.className = 'morphis-iframe';
            // SECURITY: Only allow scripts, no same-origin access
            iframe.sandbox = 'allow-scripts';
            iframe.style.display = 'none';
            iframe.style.width = '100%';
            iframe.style.height = '500px';
            iframe.style.border = 'none';
            iframe.style.marginTop = '16px';

            // Append all elements to container
            container.appendChild(promptContainer);
            container.appendChild(loadingState);
            container.appendChild(iframe);

            // Store references to DOM elements
            this.promptInput = promptInput;
            this.generateBtn = generateBtn;
            this.loadingState = loadingState;
            this.iframe = iframe;

            // Event Listeners
            generateBtn.addEventListener('click', () => self.handleSubmit());
            promptInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') self.handleSubmit();
            });
        },

        /**
         * Inject minimalist, high-end CSS for SDK UI elements
         */
        injectStyles: function () {
            // Avoid injecting styles multiple times
            if (document.getElementById('morphis-sdk-styles')) return;

            const style = document.createElement('style');
            style.id = 'morphis-sdk-styles';
            style.textContent = `
                .morphis-prompt-container {
                    display: flex;
                    gap: 8px;
                    padding: 16px;
                    background: #f8f9fa;
                    border-bottom: 1px solid #e9ecef;
                    align-items: center;
                }
                .morphis-prompt-input {
                    flex: 1;
                    padding: 12px 16px;
                    border: 1px solid #dee2e6;
                    border-radius: 6px;
                    font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
                    font-size: 14px;
                    transition: border-color 0.2s ease;
                    outline: none;
                }
                .morphis-prompt-input:focus {
                    border-color: #495057;
                }
                .morphis-generate-btn {
                    padding: 12px 24px;
                    background: #212529;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
                    font-size: 14px;
                    cursor: pointer;
                    transition: opacity 0.2s ease;
                    white-space: nowrap;
                }
                .morphis-generate-btn:hover {
                    opacity: 0.9;
                }
                .morphis-generate-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .morphis-loading {
                    padding: 24px;
                    text-align: center;
                    font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
                    color: #6c757d;
                    font-size: 14px;
                }
                .morphis-spinner {
                    width: 24px;
                    height: 24px;
                    border: 2px solid #e9ecef;
                    border-top: 2px solid #212529;
                    border-radius: 50%;
                    animation: morphis-spin 1s linear infinite;
                    margin: 0 auto 12px;
                }
                @keyframes morphis-spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .morphis-iframe {
                    transition: opacity 0.3s ease;
                }
            `;
            document.head.appendChild(style);
        },

        /**
         * Handle prompt submission: send to backend, show loading, inject result
         */
        handleSubmit: async function () {
            const prompt = this.promptInput.value.trim();
            if (!prompt) {
                alert('Please enter a prompt');
                return;
            }

            // Show loading state, hide iframe
            this.loadingState.style.display = 'block';
            this.iframe.style.display = 'none';
            this.generateBtn.disabled = true;
            this.promptInput.disabled = true;

            try {
                const response = await fetch('http://localhost:8000/api/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt: prompt,
                        apiSchema: this.config.apiSchema,
                        apiKey: this.config.apiKey
                    })
                });

                if (!response.ok) {
                    throw new Error(`Backend error: ${response.statusText}`);
                }

                const data = await response.json();
                const generatedHtml = data.html;

                // Inject generated HTML into sandboxed iframe via srcdoc
                this.iframe.srcdoc = generatedHtml;

                // Show iframe, hide loading
                this.iframe.style.display = 'block';
                this.loadingState.style.display = 'none';
            } catch (err) {
                console.error('Morphis: Failed to generate UI', err);
                this.loadingState.innerHTML = `
                    <div class="morphis-spinner" style="border-top-color: #dc3545;"></div>
                    <div>Error: ${err.message}</div>
                `;
            } finally {
                this.generateBtn.disabled = false;
                this.promptInput.disabled = false;
            }
        }
    };
})();
