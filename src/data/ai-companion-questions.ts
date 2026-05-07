/**
 * AI Companion Survey - Centralized Question Data
 * Both elder and caregiver question groups, organized by section
 */

import type { Question } from './types';

// ── Helper types ─────────────────────────────────────────────────────────────

type QuestionType = 'radio' | 'checkbox' | 'textarea' | 'scale' | 'slider' | 'matrix';

interface QuestionBase {
  code: string;
  section?: string;
  text: string;
  type: QuestionType;
}

interface RadioQuestion extends QuestionBase {
  type: 'radio';
  options: string[];
}

interface CheckboxQuestion extends QuestionBase {
  type: 'checkbox';
  options: string[];
  maxSelect?: number;
}

interface TextareaQuestion extends QuestionBase {
  type: 'textarea';
}

interface ScaleQuestion extends QuestionBase {
  type: 'scale' | 'slider';
  options: string[];
  scaleLabels?: [string, string];
}

interface MatrixQuestion extends QuestionBase {
  type: 'matrix';
  rows: string[];
  cols: string[];
}

export type SurveyQuestion = RadioQuestion | CheckboxQuestion | TextareaQuestion | ScaleQuestion | MatrixQuestion;

export interface QuestionGroup {
  code: string; // e.g., 'a1', 'b3'
  section: string; // e.g., 'A-1 基本情況'
  questions: SurveyQuestion[];
}

export interface SurveyGroups {
  [key: string]: QuestionGroup;
}

// ── Elder Question Groups ────────────────────────────────────────────────────────

export const elderGroups: Record<string, QuestionGroup> = {
  a1: {
    code: 'a1',
    section: 'A-1 基本情況',
    questions: [
      {
        code: 'A1',
        section: 'A-1 基本情況',
        text: '您目前幾歲？',
        type: 'radio',
        options: ['60–64 歲', '65–69 歲', '70–74 歲', '75–79 歲', '80 歲以上']
      },
      {
        code: 'A2',
        text: '您目前主要和誰一起住？',
        type: 'radio',
        options: ['自己一個人住', '和配偶住', '和子女住', '和看護／照顧者住', '其他']
      },
      {
        code: 'A3',
        text: '您平常使用手機的情況比較接近哪一種？',
        type: 'radio',
        options: ['幾乎不用智慧型手機', '主要用來接電話', '會看 LINE 或訊息', '會用語音／視訊', '會自己開 app 操作功能']
      },
      {
        code: 'A4',
        text: '您平常會不會用語音功能和別人互動？',
        type: 'radio',
        options: ['常常會', '偶爾會', '很少', '幾乎不會']
      }
    ]
  },
  a2: {
    code: 'a2',
    section: 'A-2 日常陪伴與孤單感',
    questions: [
      {
        code: 'A5-1',
        section: 'A-2 日常陪伴與孤單感',
        text: '您平常多久會覺得有點無聊、想找人說話？',
        type: 'radio',
        options: ['幾乎每天', '一週好幾次', '一週一兩次', '很少', '幾乎沒有']
      },
      {
        code: 'A5-2',
        text: '您平常多久會覺得明明有人可以聯絡，但又不太想麻煩孩子？',
        type: 'radio',
        options: ['幾乎每天', '一週好幾次', '一週一兩次', '很少', '幾乎沒有']
      },
      {
        code: 'A5-3',
        text: '您平常多久會希望有人主動來關心一下近況？',
        type: 'radio',
        options: ['幾乎每天', '一週好幾次', '一週一兩次', '很少', '幾乎沒有']
      },
      {
        code: 'A6',
        text: '如果您想找人說話，通常最常怎麼做？',
        type: 'checkbox',
        options: ['打電話給孩子', '傳 LINE／語音', '找朋友／鄰居', '看電視／滑手機打發時間', '不太會主動找人', '其他']
      },
      {
        code: 'A7',
        text: '您最近半年有沒有出現以下情況？',
        type: 'checkbox',
        options: ['常常一個人在家', '常說無聊或沒人說話', '睡不好或半夜常醒', '覺得心情比較低落', '忘東忘西變多', '身體不舒服時不太想跟家人說', '都沒有', '其他']
      }
    ]
  },
  a3: {
    code: 'a3',
    section: 'A-3 對語音 AI 夥伴的接受度',
    questions: [
      {
        code: 'A8',
        section: 'A-3 對語音 AI 夥伴的接受度',
        text: '您看到這樣的語音 AI 夥伴，第一反應比較接近哪一個？',
        type: 'radio',
        options: ['願意試試看', '可以了解看看', '不確定', '不太想用', '完全不想用']
      },
      {
        code: 'A9',
        text: '如果要試試看，您最希望它做到哪幾件事？（最多選 3 項）',
        type: 'checkbox',
        maxSelect: 3,
        options: ['每天問安', '陪我聊幾句', '記得我前幾天說過的事', '提醒生活小事', '心情不好時陪我說說話', '讓孩子比較放心', '其他']
      },
      {
        code: 'A10',
        text: '您最擔心的是什麼？（最多選 3 項）',
        type: 'checkbox',
        maxSelect: 3,
        options: ['它聽不懂我說話', '操作太麻煩', '感覺像在監視我', '我說的話被別人看到', '太假不像真人', '會打擾我', '我不需要', '其他']
      }
    ]
  },
  a4: {
    code: 'a4',
    section: 'A-4 互動頻率與入口偏好',
    questions: [
      {
        code: 'A11',
        section: 'A-4 互動頻率與入口偏好',
        text: '如果有一個很簡單的語音 AI 夥伴，會主動來和您問安、聊幾句，您最能接受哪種頻率？',
        type: 'radio',
        options: ['每天 1 次每次約 1 分鐘', '每天 1 次每次約 3 分鐘', '每週 3 次', '有需要時再用', '我不想用這種服務']
      },
      {
        code: 'A12',
        text: '您會比較喜歡它用哪種方式來找您？',
        type: 'radio',
        options: ['像接電話一樣', '像 LINE 語音一樣', '打開 app 說話', '都可以', '都不喜歡']
      },
      {
        code: 'A13',
        text: '如果第一次要學，您比較希望誰幫您？',
        type: 'radio',
        options: ['孩子／孫子女', '服務人員', '朋友／鄰居', '我可以自己試', '我不想學']
      }
    ]
  },
  a5: {
    code: 'a5',
    section: 'A-5 名字、人格與夥伴感',
    questions: [
      {
        code: 'A14',
        section: 'A-5 名字、人格與夥伴感',
        text: '如果這個 AI 夥伴可以讓您幫它取名字、選它講話的感覺，您覺得：',
        type: 'radio',
        options: ['會更有親切感', '有一點加分', '沒差', '反而有點怪', '很不喜歡']
      },
      {
        code: 'A15',
        text: '您比較能接受把它當成哪一種？',
        type: 'radio',
        options: ['問安小助手', '陪我聊幾句的夥伴', '像朋友一樣', '像家人一樣', '我不想把它擬人化']
      }
    ]
  },
  a6: {
    code: 'a6',
    section: 'A-6 分享邊界與隱私',
    questions: [
      {
        code: 'A16',
        section: 'A-6 分享邊界與隱私',
        text: '如果孩子只能知道「今天有沒有和您問安，還有您大致好不好」，您能接受嗎？',
        type: 'radio',
        options: ['很能接受', '可以接受', '普通', '不太能接受', '完全不能接受']
      },
      {
        code: 'A17',
        text: '如果孩子可以知道「您最近幾天心情大致比較好、普通、或比較低」，您能接受嗎？',
        type: 'radio',
        options: ['很能接���', '可以接受', '普通', '不太能接受', '完全不能接受']
      },
      {
        code: 'A18',
        text: '如果孩子可以看到 2 到 3 句短摘要，例如「今天提到睡不好、胃口普通」，您能接受嗎？',
        type: 'radio',
        options: ['很能接受', '可以接受', '普通', '不太能接受', '完全不能接受']
      },
      {
        code: 'A19',
        text: '如果孩子可以看到比較完整的聊天內容重點，您能接受嗎？',
        type: 'radio',
        options: ['很能接受', '可以接受', '普通', '不太能接受', '完全不能接受']
      },
      {
        code: 'A20',
        text: '哪些內容您一定不想讓孩子看到？',
        type: 'checkbox',
        options: ['我的情緒細節', '我對家人的抱怨', '金錢相關', '身體不舒服的細節', '私密生活', '我和別人的私下談話', '其他', '沒有特別']
      },
      {
        code: 'A21',
        text: '如果系統平常只提供孩子簡單狀態，只有在明顯異常時才多通知一些資訊，您能接受嗎？',
        type: 'radio',
        options: ['很能接受', '可以接受', '普通', '不太能接受', '完全不能接受']
      }
    ]
  },
  a7: {
    code: 'a7',
    section: 'A-7 控制權需求',
    questions: [
      {
        code: 'A22',
        section: 'A-7 控制權需求',
        text: '以下哪些做法會讓您比較安心？（最多選 3 項）',
        type: 'checkbox',
        maxSelect: 3,
        options: ['我可以自己選擇要分享多少資訊', '我可以隨時暫停分享', '要送給孩子前我會先知道會送什麼', '只有異常時才分享更多', '我可以指定只給哪一位家人看', '其他', '這些都不重要']
      },
      {
        code: 'A23',
        text: '如果真的開始使用，您最希望它保持什麼樣子？',
        type: 'radio',
        options: ['越簡單越好不要太多功能', '有固定問安就好', '能陪聊幾句比較好', '能幫孩子放心比較重要', '不確定']
      }
    ]
  },
  a8: {
    code: 'a8',
    section: 'A-8 試用與持續使用意願',
    questions: [
      {
        code: 'A24',
        section: 'A-8 試用與持續使用意願',
        text: '如果這個服務真的很簡單，而且可以讓孩子比較放心，您願意試用 7 天嗎？',
        type: 'radio',
        options: ['很願意', '願意', '看情況', '不太願意', '完全不願意']
      },
      {
        code: 'A25',
        text: '如果試用後覺得不錯，您覺得自己最可能怎麼使用？',
        type: 'radio',
        options: ['幾乎每天', '一週好幾次', '一週一兩次', '偶爾', '不會持續用']
      },
      {
        code: 'A26',
        text: '對您來說，這種 AI 夥伴最重要的是什麼？（非必填）',
        type: 'textarea'
      }
    ]
  }
};

// ── Caregiver Question Groups ───────────────────────────────────────────────

export const caregiverGroups: Record<string, QuestionGroup> = {
  b1: {
    code: 'b1',
    section: 'B-1 基本情況',
    questions: [
      {
        code: 'B1',
        section: 'B-1 基本情況',
        text: '您和這位長輩的關係是？',
        type: 'radio',
        options: ['子女', '孫子女', '兄弟姊妹', '其他親屬', '朋友／其他照顧者']
      },
      {
        code: 'B2',
        text: '您和這位長輩目前的居住關係是？',
        type: 'radio',
        options: ['同住', '不同住但同一棟／同一社區', '不同住但同一城市', '不同城市', '不同國家']
      },
      {
        code: 'B3',
        text: '這位長輩目前主要和誰一起住？',
        type: 'radio',
        options: ['自己一個人住', '和配偶住', '和子女住', '和看護／照顧者住', '其他']
      },
      {
        code: 'B4',
        text: '您平常覺得這位長輩使用手機的能力比較接近哪一種？',
        type: 'radio',
        options: ['幾乎不用智慧型手機', '主要接電話', '會看 LINE 或訊息', '會語音／視訊', '會自己操作 app']
      }
    ]
  },
  b2: {
    code: 'b2',
    section: 'B-2 痛點強度與照顧壓力',
    questions: [
      {
        code: 'B5',
        section: 'B-2 痛點強度與照顧壓力',
        text: '您平均多久會主動確認一次這位長輩的狀況？',
        type: 'radio',
        options: ['幾乎每天', '一週好幾次', '一週一次', '一個月幾次', '很少']
      },
      {
        code: 'B6',
        text: '您目前最常用哪種方式確認這位長辈的狀況？',
        type: 'checkbox',
        options: ['打電話', 'LINE 文字', 'LINE 語音／視訊', '問其他家人', '看護／照服員回報', '長輩主動聯絡我', '其實沒有固定方式', '其他']
      },
      {
        code: 'B7',
        text: '以下哪些情況最讓您擔心？',
        type: 'checkbox',
        options: ['長輩太孤單／沒有人說話', '心情變差但沒人知道', '忘東忘西變嚴重', '跌倒／身體異常', '沒接電話不知道怎���了', '作息突然變亂', '我沒有時間常常關心', '其他']
      },
      {
        code: 'B8',
        text: '您目前對這位長輩的擔心程度大概是？',
        type: 'slider',
        options: Array.from({ length: 11 }, (_, i) => String(i)),
        scaleLabels: ['幾乎不擔心', '非常擔心']
      },
      {
        code: 'B9',
        text: '這份擔心多久會影響您的情緒、注意力或生活安排？',
        type: 'radio',
        options: ['幾乎每天', '一週好幾次', '一週一兩次', '很少', '幾乎沒有']
      }
    ]
  },
  b3: {
    code: 'b3',
    section: 'B-3 現有替代方案',
    questions: [
      {
        code: 'B10',
        section: 'B-3 現有替代方案',
        text: '您目前有沒有用過以下工具或管道來幫助自己關心長輩？（每列請選一項）',
        type: 'matrix',
        rows: ['固定電話問安', '家庭群組回報', '視訊', '智慧手錶／緊急求助裝置', '遠距監測／感測設備', '請親友鄰居幫忙看', '看護／照服員', '其他 app／工具'],
        cols: ['有在用', '用過但停了', '沒用過']
      },
      {
        code: 'B11',
        text: '除了上面這些工具或管道，您現在是否有固定的關心流程或分工方式？',
        type: 'checkbox',
        options: ['有固定時段主動聯絡', '和其他家人輪流關心', '會和長輩約定主動報平安', '如果一段時間聯絡不上，會找其他人協助確認', '會請住得近的親友／鄰居協助留意', '會依長輩最近身體或情緒狀況調整關心頻率', '沒有特別固定流程', '其他']
      },
      {
        code: 'B12',
        text: '您對現有方式最不滿意的地方是？',
        type: 'checkbox',
        options: ['太花時間', '資訊不連續', '太像監視', '只能事後才知道，無法提前發現', '家人之間不好協調', '成本太高', '沒有真正減少我的焦慮', '其他']
      }
    ]
  },
  b4: {
    code: 'b4',
    section: 'B-4 對 AI 夥伴概念的反應',
    questions: [
      {
        code: 'B13',
        section: '產品說明',
        text: '想像一下：如果有一個語音 AI 夥伴，會每天主動致電問候長輩、陪長輩聊幾句、主動記得長輩說過的事並在適當時拿出來聊，也會貼心提醒長輩該吃藥、該運動。身為家屬，您每天會收到長輩的情緒分數與互動摘要；當長輩說出「感覺生活好沒意義」等可能代表情緒低落的關鍵句時，系統會立即發出警報通知您。您第一反應比較接近哪一個？',
        type: 'radio',
        options: ['很有興趣', '有點興趣', '普通', '不太有興趣', '完全沒興趣']
      },
      {
        code: 'B14',
        section: 'B-4 對 AI 夥伴概念的反應',
        text: '如果只能選一個，您最在意這個服務帶來的哪個價值？',
        type: 'radio',
        options: ['長輩比較不孤單', '我每天比較放心', '我能更早知道異常', '我不用一直自己打電話', '家人之間更容易分工']
      },
      {
        code: 'B15',
        text: '如果只能選兩個，您最希望這個服務做到哪兩件事？',
        type: 'checkbox',
        maxSelect: 2,
        options: ['每天幫忙問安', '長輩能有人聊幾句', '提供心情／狀態趨勢', '異常早知道', '沒有 check-in 時提醒我', '幫助家人協作', '其他']
      }
    ]
  },
  b5: {
    code: 'b5',
    section: 'B-5 家屬想要的輸出格式',
    questions: [
      {
        code: 'B16',
        section: 'B-5 家屬想要的輸出格式',
        text: '如果只能選一種，您最想收到哪一種資訊？',
        type: 'radio',
        options: ['今天是否完成 check-in + 綠黃紅狀態', '情緒／互動趨勢儀表板', '2-3 句短摘要', '狀態+趨勢+異常提醒', '更完整的內容摘��']
      },
      {
        code: 'B17',
        text: '哪種提醒方式對您最有價值？',
        type: 'checkbox',
        options: ['今天完全沒有 check-in', '情緒明顯比平常低', '作息突然異常', '提到身體不舒服', '提到孤單／很低落', '互動內容看起來怪怪的', '不需要提醒我自己有空看就好']
      },
      {
        code: 'B18',
        text: '對您來說，以下哪一種最不能接受？',
        type: 'radio',
        options: ['完全沒有提醒', '提醒太多', '提醒太模糊不知道要不要處理', '看不到趨勢', '摘要太少', '摘要太多']
      },
      {
        code: 'B19',
        text: '您比較偏好哪種方式？',
        type: 'radio',
        options: ['平常只看簡單狀態異常時才多給一些資訊', '平常每天看短摘要就好', '平常看趨勢有異常再看摘要', '想看得越完整越好', '不確定']
      }
    ]
  },
  b6: {
    code: 'b6',
    section: 'B-6 分享邊界與長輩控制權',
    questions: [
      {
        code: 'B20',
        section: 'B-6 分享邊界與長輩控制權',
        text: '哪些內容您覺得「不一定需要知道」？',
        type: 'checkbox',
        options: ['長輩所有情緒細節', '長輩對家人的抱怨', '金錢話題', '私人生活', '與其他人的私下談話', '其實我都想知道', '其他']
      },
      {
        code: 'B21',
        text: '如果長輩可以自己決定要分享到什麼程度，您是否可以接受？',
        type: 'radio',
        options: ['很能接受', '能接受', '普通', '不太能接受', '不能接受']
      },
      {
        code: 'B22',
        text: '您覺得最合理的做法是？',
        type: 'radio',
        options: ['平常只給我大致狀態異常才多一點資訊', '平常就給我短摘要', '平常給我趨勢必要時再看摘要', '我希望看得更完整', '不確定']
      }
    ]
  },
  b7: {
    code: 'b7',
    section: 'B-7 採用、付費與價格',
    questions: [
      {
        code: 'B23',
        section: 'B-7 採用、付費與價格',
        text: '如果這個服務能讓您更早知道異常、平常也能比較放心，您願意試用嗎？',
        type: 'radio',
        options: ['很願意', '願意', '看情況', '不太願意', '完全不願意']
      },
      {
        code: 'B24',
        text: '若試用後覺得有幫助，您最可能願意為哪個價值付費？',
        type: 'checkbox',
        options: ['每天有人幫忙 check-in', '異常早知道', '心情／狀態趨勢', '長輩比較不孤單', '我比較不用一直自己打電話', '家人之間更好分工', '其他']
      },
      {
        code: 'B25',
        text: '對您來說，以下哪個月費最有可能考慮？',
        type: 'radio',
        options: ['NT$149 以下', 'NT$150-299', 'NT$300-499', 'NT$500-799', 'NT$800 以上', '完全不會考慮付費']
      },
      {
        code: 'B26',
        text: '哪個價格會讓您覺得「太便宜，反而有點不放心」？',
        type: 'radio',
        options: ['NT$149 以下', 'NT$150-299', 'NT$300-499', 'NT$500-799', 'NT$800 以上', '沒有這種感覺']
      },
      {
        code: 'B27',
        text: '哪個價格會讓您覺得「開始有點貴，但還可能考慮」？',
        type: 'radio',
        options: ['NT$149 以下', 'NT$150-299', 'NT$300-499', 'NT$500-799', 'NT$800 以上']
      },
      {
        code: 'B28',
        text: '哪個價格會讓您覺得「太貴，不會考慮」？',
        type: 'radio',
        options: ['NT$149 以下', 'NT$150-299', 'NT$300-499', 'NT$500-799', 'NT$800 以上']
      },
      {
        code: 'B29',
        text: '如果價格一樣，您更願意為哪一種買單？',
        type: 'radio',
        options: ['陪伴聊天為主', '問安+短摘要', '問安+異常提醒', '問安+短摘要+異常提醒', '我不會買']
      }
    ]
  },
  b8: {
    code: 'b8',
    section: 'B-8 多照顧者協作與權限',
    questions: [
      {
        code: 'B30',
        section: 'B-8 多照顧者協作與權限',
        text: '平常是否只有您一個人主要在關心這位長輩？',
        type: 'radio',
        options: ['幾乎是我一個人', '主要是我但也有其他人', '有兩三個人一起', '很多人都會管', '不一定']
      },
      {
        code: 'B31',
        text: '如果有這個服務，您覺得最合理的權限方式是？',
        type: 'radio',
        options: ['只給一位主要家屬看', '一位主要家屬+其他人只看簡單狀態', '所有家人都看一樣內容', '由長輩自己設定', '不確定']
      },
      {
        code: 'B32',
        text: '如果系統偵測到異常，第一個應該通知誰？',
        type: 'radio',
        options: ['主要家屬', '最近住得近的人', '所有家人', '先提醒長輩本人', '視情況而定']
      }
    ]
  },
  b9: {
    code: 'b9',
    section: 'B-9 開放題',
    questions: [
      {
        code: 'B33',
        section: 'B-9 開放題',
        text: '如果這個 AI 夥伴真的要讓您願意持續使用，最重要的一件事是什麼？（非必填）',
        type: 'textarea'
      },
      {
        code: 'B34',
        text: '您最怕這個 AI 夥伴做不好的地方是什麼？（非必填）',
        type: 'textarea'
      }
    ]
  }
};

// ── Navigation Helper ─────────────────────────────────────────────────────

export const ELDER_SECTIONS = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'contact'];
export const CAREGIVER_SECTIONS = ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9', 'contact'];

export function getNextSection(role: 'elder' | 'caregiver', currentSection: string): string | null {
  const sections = role === 'elder' ? ELDER_SECTIONS : CAREGIVER_SECTIONS;
  const idx = sections.indexOf(currentSection);
  if (idx === -1 || idx === sections.length - 1) return null;
  return sections[idx + 1];
}

export function getPrevSection(role: 'elder' | 'caregiver', currentSection: string): string | null {
  const sections = role === 'elder' ? ELDER_SECTIONS : CAREGIVER_SECTIONS;
  const idx = sections.indexOf(currentSection);
  if (idx <= 0) return null;
  return sections[idx - 1];
}

export function getSectionTitle(role: 'elder' | 'caregiver', section: string): string {
  if (section === 'contact') return '聯絡與後續參與意願';
  const groups = role === 'elder' ? elderGroups : caregiverGroups;
  const group = groups[section];
  return group?.section || section;
}