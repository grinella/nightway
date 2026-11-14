import UIKit
import WebKit

/// Involucro nativo di NIGHTWAY: barra a schede, capsula di stato, pulsanti e pannello sono controlli iOS
/// (Liquid Glass di sistema); il contenuto di ogni schermata è una pagina web di `/native/*`.
enum Shell {
    /// In sviluppo: `SIMCTL_CHILD_NW_BASE_URL=http://localhost:3210 xcrun simctl launch …`
    static let base = URL(string: ProcessInfo.processInfo.environment["NW_BASE_URL"] ?? "https://nightway.vercel.app")!
    static let night = UIColor(red: 11 / 255, green: 15 / 255, blue: 23 / 255, alpha: 1)
    static let sodium = UIColor(red: 1, green: 179 / 255, blue: 71 / 255, alpha: 1)
    static let alert = UIColor(red: 1, green: 138 / 255, blue: 128 / 255, alpha: 1)
}

/// Testi e stati calcolati dalla pagina web (`nativeChrome` in `src/lib/app-state.ts`).
struct Chrome {
    var title = "Tocca la mappa: scegli la partenza."
    var subtitle = "Area pilota: Testaccio / Ostiense"
    var isError = false
    var canReset = false
    var hasRoutes = false
    var showLayer = true
    var tilted = true

    init() {}

    init(_ raw: [String: Any]) {
        title = raw["title"] as? String ?? title
        subtitle = raw["subtitle"] as? String ?? ""
        isError = raw["isError"] as? Bool ?? false
        canReset = raw["canReset"] as? Bool ?? false
        hasRoutes = raw["hasRoutes"] as? Bool ?? false
        showLayer = raw["showLayer"] as? Bool ?? true
        tilted = raw["tilted"] as? Bool ?? true
    }
}

/// Ogni schermata è una pagina web separata: questo oggetto ricopia lo stato dell'app dall'una alle altre.
final class StateHub: NSObject, WKScriptMessageHandler, WKUIDelegate, WKNavigationDelegate {
    private let webViews = NSHashTable<WKWebView>.weakObjects()
    private var lastState: String?
    private weak var mapWebView: WKWebView?
    var onChrome: ((Chrome) -> Void)?

    func makeWebView(path: String, isMap: Bool = false) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        configuration.userContentController.add(self, name: "nightway")

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.backgroundColor = .clear
        webView.uiDelegate = self
        webView.navigationDelegate = self
        webView.load(URLRequest(url: Shell.base.appendingPathComponent(path)))
        webViews.add(webView)
        if isMap { mapWebView = webView }
        return webView
    }

    /// Comando di un pulsante nativo: lo esegue la pagina della mappa, che poi ripubblica lo stato.
    func send(_ action: String) {
        mapWebView?.evaluateJavaScript("window.__nwAction && window.__nwAction('\(action)')")
    }

    private func deliver(_ state: String, to webView: WKWebView) {
        webView.callAsyncJavaScript("window.__nwReceive && window.__nwReceive(json)", arguments: ["json": state], in: nil, in: .page, completionHandler: nil)
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let type = body["type"] as? String else { return }
        if type == "ready" {
            if let lastState, let webView = message.webView { deliver(lastState, to: webView) }
            return
        }
        guard type == "state", let state = body["state"] as? String else { return }
        lastState = state
        for webView in webViews.allObjects where webView !== message.webView { deliver(state, to: webView) }
        if let chrome = body["chrome"] as? [String: Any] { onChrome?(Chrome(chrome)) }
    }

    func webView(_ webView: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin, initiatedByFrame frame: WKFrameInfo,
                 type: WKMediaCaptureType, decisionHandler: @escaping (WKPermissionDecision) -> Void) {
        decisionHandler(origin.host == Shell.base.host ? .grant : .deny)
    }

    /// I collegamenti esterni (licenze, OpenStreetMap) si aprono in Safari, non dentro l'app.
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if navigationAction.navigationType == .linkActivated, let url = navigationAction.request.url, url.host != Shell.base.host {
            UIApplication.shared.open(url)
            decisionHandler(.cancel)
            return
        }
        decisionHandler(.allow)
    }

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction,
                 windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = navigationAction.request.url { UIApplication.shared.open(url) }
        return nil
    }

    /// Senza rete al primo avvio: riprova finché la pagina non si carica.
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        guard let url = webView.url ?? (error as NSError).userInfo[NSURLErrorFailingURLErrorKey] as? URL else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + 3) { webView.load(URLRequest(url: url)) }
    }
}

/// Una schermata il cui contenuto è una pagina web a tutto schermo.
class WebPageController: UIViewController {
    let webView: WKWebView
    private let background: UIColor

    init(webView: WKWebView, title: String, background: UIColor) {
        self.webView = webView
        self.background = background
        super.init(nibName: nil, bundle: nil)
        self.title = title
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) non usato") }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = background
        webView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(webView)
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.topAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
        ])
        // Le barre di sistema seguono lo scorrimento della pagina (titolo grande, barra che si riduce).
        webView.scrollView.contentInsetAdjustmentBehavior = .always
        setContentScrollView(webView.scrollView)
    }
}

/// La mappa, con i pulsanti rotondi in vetro sul lato destro.
final class MapController: WebPageController {
    private let hub: StateHub
    private lazy var tiltButton = fab(label: "Vista 3D", action: "toggleTilt")
    private lazy var layerButton = fab(label: "Dati mappati attorno ai percorsi", action: "toggleLayer")
    private lazy var fitButton = fab(label: "Inquadra i percorsi", action: "fit")

    init(hub: StateHub) {
        self.hub = hub
        super.init(webView: hub.makeWebView(path: "native/map", isMap: true), title: "Mappa", background: Shell.night)
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.isScrollEnabled = false

        let stack = UIStackView(arrangedSubviews: [tiltButton, layerButton, fitButton])
        stack.axis = .vertical
        stack.spacing = 10
        stack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -12),
            stack.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 44),
        ])
        apply(Chrome())
    }

    private func fab(label: String, action: String) -> UIButton {
        var configuration = UIButton.Configuration.glass()
        configuration.cornerStyle = .capsule
        configuration.preferredSymbolConfigurationForImage = UIImage.SymbolConfiguration(pointSize: 18, weight: .semibold)
        let button = UIButton(configuration: configuration, primaryAction: UIAction { [hub] _ in hub.send(action) })
        button.accessibilityLabel = label
        NSLayoutConstraint.activate([button.widthAnchor.constraint(equalToConstant: 50), button.heightAnchor.constraint(equalToConstant: 50)])
        return button
    }

    func apply(_ chrome: Chrome) {
        set(tiltButton, symbol: chrome.tilted ? "view.3d" : "view.2d", active: chrome.tilted)
        set(layerButton, symbol: "square.3.layers.3d", active: chrome.showLayer)
        set(fitButton, symbol: "scope", active: false)
        fitButton.isHidden = !chrome.hasRoutes
    }

    private func set(_ button: UIButton, symbol: String, active: Bool) {
        button.configuration?.image = UIImage(systemName: symbol)
        button.configuration?.baseForegroundColor = active ? Shell.sodium : .label
        button.accessibilityTraits = active ? [.button, .selected] : .button
    }
}

/// Capsula sopra la barra a schede, come il mini player di Musica: dice cosa fare o riassume il percorso
/// scelto; un tocco apre il pannello dei percorsi.
final class StatusAccessory: UIView {
    private let icon = UIImageView(image: UIImage(systemName: "figure.walk"))
    private let titleLabel = UILabel()
    private let subtitleLabel = UILabel()
    private let resetButton = UIButton(type: .system)
    private let chevron = UIImageView(image: UIImage(systemName: "chevron.up"))
    var onOpen: (() -> Void)?

    init(onReset: @escaping () -> Void) {
        super.init(frame: .zero)
        icon.tintColor = Shell.sodium
        icon.contentMode = .scaleAspectFit
        icon.preferredSymbolConfiguration = UIImage.SymbolConfiguration(pointSize: 20, weight: .semibold)
        chevron.tintColor = .secondaryLabel
        chevron.preferredSymbolConfiguration = UIImage.SymbolConfiguration(pointSize: 13, weight: .bold)

        titleLabel.font = .preferredFont(forTextStyle: .subheadline).withWeight(.semibold)
        titleLabel.adjustsFontForContentSizeCategory = true
        subtitleLabel.font = .preferredFont(forTextStyle: .caption1)
        subtitleLabel.adjustsFontForContentSizeCategory = true

        resetButton.setImage(UIImage(systemName: "xmark.circle.fill"), for: .normal)
        resetButton.tintColor = .secondaryLabel
        resetButton.accessibilityLabel = "Cancella partenza e arrivo"
        resetButton.addAction(UIAction { _ in onReset() }, for: .touchUpInside)

        let labels = UIStackView(arrangedSubviews: [titleLabel, subtitleLabel])
        labels.axis = .vertical
        labels.spacing = 1
        let row = UIStackView(arrangedSubviews: [icon, labels, chevron, resetButton])
        row.alignment = .center
        row.spacing = 10
        row.translatesAutoresizingMaskIntoConstraints = false
        addSubview(row)
        for view in [icon, chevron, resetButton] { view.setContentHuggingPriority(.required, for: .horizontal) }
        NSLayoutConstraint.activate([
            row.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 16),
            row.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -8),
            row.topAnchor.constraint(equalTo: topAnchor),
            row.bottomAnchor.constraint(equalTo: bottomAnchor),
            resetButton.widthAnchor.constraint(equalToConstant: 44),
            resetButton.heightAnchor.constraint(greaterThanOrEqualToConstant: 44),
        ])

        addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(open)))
        isAccessibilityElement = false
        apply(Chrome())
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) non usato") }

    @objc private func open() { onOpen?() }

    func apply(_ chrome: Chrome) {
        titleLabel.text = chrome.title
        subtitleLabel.text = chrome.subtitle
        subtitleLabel.textColor = chrome.isError ? Shell.alert : .secondaryLabel
        subtitleLabel.isHidden = chrome.subtitle.isEmpty
        resetButton.isHidden = !chrome.canReset
        chevron.isHidden = chrome.canReset
    }
}

private extension UIFont {
    func withWeight(_ weight: UIFont.Weight) -> UIFont {
        let descriptor = fontDescriptor.addingAttributes([.traits: [UIFontDescriptor.TraitKey.weight: weight]])
        return UIFont(descriptor: descriptor, size: 0)
    }
}

/// Pannello dei percorsi: foglio di sistema a due altezze, la mappa dietro resta utilizzabile.
final class RoutesSheetController: WebPageController {
    init(hub: StateHub) {
        super.init(webView: hub.makeWebView(path: "native/routes"), title: "Percorsi", background: .clear)
        if let sheet = sheetPresentationController {
            sheet.detents = [.medium(), .large()]
            sheet.prefersGrabberVisible = true
            sheet.largestUndimmedDetentIdentifier = .medium
        }
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        additionalSafeAreaInsets.top = 20
    }
}

final class RootController: UITabBarController {
    private let hub = StateHub()
    private lazy var map = MapController(hub: hub)
    private lazy var routesSheet = RoutesSheetController(hub: hub)
    private lazy var status = StatusAccessory(onReset: { [hub] in hub.send("reset") })

    override func viewDidLoad() {
        super.viewDidLoad()
        overrideUserInterfaceStyle = .dark
        view.tintColor = Shell.sodium
        view.backgroundColor = Shell.night

        let assistant = page(path: "native/assistant", title: "Assistente")
        let info = page(path: "native/info", title: "Legenda")
        tabs = [
            UITab(title: "Mappa", image: UIImage(systemName: "map"), identifier: "map") { [map] _ in map },
            UITab(title: "Assistente", image: UIImage(systemName: "waveform"), identifier: "assistant") { _ in assistant },
            UITab(title: "Legenda", image: UIImage(systemName: "info.circle"), identifier: "info") { _ in info },
        ]
        tabBarMinimizeBehavior = .onScrollDown

        status.onOpen = { [weak self] in self?.openRoutes() }
        bottomAccessory = UITabAccessory(contentView: status)

        hub.onChrome = { [weak self] chrome in
            self?.status.apply(chrome)
            self?.map.apply(chrome)
        }
        // Carica subito le pagine: al primo tocco pannello e schede sono già pronti.
        for controller in [routesSheet, assistant.viewControllers[0], info.viewControllers[0]] { controller.loadViewIfNeeded() }
        #if DEBUG
        runDebugScript()
        #endif
    }

    #if DEBUG
    /// Solo per le prove nel simulatore, dove non si può toccare lo schermo da riga di comando:
    /// `NW_DEBUG_JS` viene eseguito nella pagina dei percorsi, `NW_DEBUG_SHEET` apre il pannello,
    /// `NW_DEBUG_TAB` sceglie una scheda.
    private func runDebugScript() {
        let environment = ProcessInfo.processInfo.environment
        DispatchQueue.main.asyncAfter(deadline: .now() + 8) { [self] in
            if let script = environment["NW_DEBUG_JS"] { routesSheet.webView.evaluateJavaScript(script) }
            if let index = environment["NW_DEBUG_TAB"].flatMap(Int.init) { selectedTab = tabs[index] }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 20) { [self] in
            if let detent = environment["NW_DEBUG_SHEET"] {
                openRoutes()
                if detent == "large" { routesSheet.sheetPresentationController?.selectedDetentIdentifier = .large }
            }
        }
    }
    #endif

    private func page(path: String, title: String) -> UINavigationController {
        let controller = WebPageController(webView: hub.makeWebView(path: path), title: title, background: Shell.night)
        let navigation = UINavigationController(rootViewController: controller)
        navigation.navigationBar.prefersLargeTitles = true
        return navigation
    }

    private func openRoutes() {
        guard presentedViewController == nil else { return }
        present(routesSheet, animated: true)
    }
}
